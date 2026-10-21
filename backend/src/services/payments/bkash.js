import { decryptSecret } from '../../utils/encryption.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

// bKash documents a 30 second service timeout for every API (developer.bka.sh); aborting sooner could
// cut off an Execute Payment that is still completing.
const TIMEOUT_MS = 30000;

// "Create Payment" / "Grant Token" (https://developer.bka.sh/docs/create-payment-3, /docs/grant-token) list the
// sandbox base below. The docs publish no production host; it is the same path on bKash's `pay` host.
function baseUrl(mode) {
  return mode === 'live'
    ? 'https://tokenized.pay.bka.sh/v2/tokenized-checkout'
    : 'https://tokenized.sandbox.bka.sh/v2/tokenized-checkout';
}

// Grant Token may be called at most twice an hour (exceeding it blocks the app for an hour) and tokens
// live for `expires_in` seconds (default 3600), so one token is reused across orders instead of
// granting a fresh one per call. The in-flight promise is cached, so concurrent callers share a grant.
const TOKEN_MARGIN_MS = 2 * 60 * 1000;
const tokenCache = new Map();

async function requestToken(gw) {
  const res = await fetch(`${baseUrl(gw.mode)}/auth/grant-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      username: gw.username,
      password: decryptSecret(gw.password),
    },
    body: JSON.stringify({ app_key: gw.appKey, app_secret: decryptSecret(gw.appSecret) }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = await res.json();
  if (!data.id_token) throw new Error(data.statusMessage || 'bKash token grant failed');
  return { idToken: data.id_token, expiresIn: Number(data.expires_in) || 3600 };
}

function grantToken(gw) {
  const key = `${gw.mode}|${gw.appKey}|${gw.username}`;
  const cached = tokenCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;

  const entry = { expiresAt: Date.now() + TIMEOUT_MS }; // provisional, while the grant is in flight
  entry.promise = requestToken(gw).then(({ idToken, expiresIn }) => {
    entry.expiresAt = Date.now() + expiresIn * 1000 - TOKEN_MARGIN_MS;
    return idToken;
  });
  tokenCache.set(key, entry);
  entry.promise.catch(() => tokenCache.delete(key));
  return entry.promise;
}

async function post(gw, idToken, path, body) {
  const res = await fetch(`${baseUrl(gw.mode)}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: idToken,
      'X-APP-Key': gw.appKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return res.json();
}

export async function initPayment({ order, settings }) {
  const gw = settings.paymentGateways.bkash;
  const idToken = await grantToken(gw);

  // Create Payment fields exactly as documented (there is no `mode` field in the current API).
  const data = await post(gw, idToken, '/payment/create', {
    payerReference: order.shippingAddress.phone,
    callbackURL: `${env.apiBaseUrl}/api/v1/payments/bkash/callback`,
    amount: Number(order.pricing.grandTotal).toFixed(2),
    currency: 'BDT',
    intent: 'sale',
    merchantInvoiceNumber: order.orderNumber,
  });

  // The docs spell the redirect field `bKashURL` in the table and `bkashURL` in the sample response.
  const redirectUrl = data.bKashURL || data.bkashURL;
  if (!redirectUrl || !data.paymentId) {
    logger.warn('bKash: create payment failed:', data.externalCode, data.errorMessageEn);
    throw new Error(data.errorMessageEn || 'Failed to initiate bKash payment');
  }

  return { redirectUrl, reference: data.paymentId };
}

// A payment can be executed once only; these Execute Payment errors mean it already went through.
const ALREADY_EXECUTED = new Set(['2062', '2117']);

/** Why an apparently Completed payment must still be refused, or null when it matches the order. */
function mismatch(data, order) {
  const expected = order.pricing.grandTotal;
  if (!(Math.abs(Number(data.amount) - expected) < 0.005)) {
    return `Amount mismatch: gateway confirmed ${data.amount}, order total is ${expected}`;
  }
  if (data.currency !== 'BDT') return `Currency mismatch: gateway confirmed ${data.currency}`;
  const invoice = data.merchantInvoiceNumber ?? data.merchantInvoice; // Query Payment names it merchantInvoice
  if (invoice && invoice !== order.orderNumber) return `Invoice mismatch: payment belongs to ${invoice}`;
  return null;
}

export async function verifyPayment({ query, settings, order }) {
  const gw = settings.paymentGateways.bkash;
  const { paymentID, status } = query; // the callback appends paymentID, status (success|failure|cancel), signature

  // Execute Payment is only to be called once the success callback arrives.
  if (status !== 'success' || !paymentID || !order) {
    return { success: false, transactionId: null, raw: query };
  }

  try {
    const idToken = await grantToken(gw);

    let data = await post(gw, idToken, '/payment/execute', { paymentId: paymentID }).catch((err) => {
      logger.warn('bKash: execute payment did not answer:', err.message);
      return null;
    });
    // Per the docs, a missing answer (timeout, network, non-JSON) or "already completed" is settled by
    // Query Payment, which holds the real state; an unanswered execute is not proof of failure.
    if (!data || ALREADY_EXECUTED.has(String(data.externalCode))) {
      data = await post(gw, idToken, '/query/payment', { paymentId: paymentID });
    }

    if (data.transactionStatus !== 'Completed') return { success: false, transactionId: null, raw: data };

    const problem = mismatch(data, order);
    if (problem) {
      logger.warn(`bKash: ${order.orderNumber} payment ${paymentID} refused:`, problem);
      return { success: false, transactionId: null, raw: { ...data, error: problem } };
    }
    return { success: true, transactionId: data.trxId || null, raw: data };
  } catch (err) {
    logger.warn('bKash: verify failed:', err.message);
    return { success: false, transactionId: null, raw: { error: err.message } };
  }
}
