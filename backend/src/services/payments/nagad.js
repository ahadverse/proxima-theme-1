import crypto from 'node:crypto';
import net from 'node:net';
import { decryptSecret } from '../../utils/encryption.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

// Built from Nagad's "Online Payment API Integration Guide" v3.3 (Oct 2021): initialize ->
// place order (complete) -> redirect -> callback -> check payment status (verify).
const API_VERSION = 'v-0.2.0';
const CLIENT_TYPE = 'PC_WEB';
// X-KM-IP-V4 is the shopper's IPv4; behind localhost / an IPv6 address there is none to send.
const FALLBACK_IP = '103.100.200.100';
// The guide says SHA1withRSA, but every Nagad SDK in production (PHP, Node, Python, Laravel) signs
// with SHA-256 — keep this in one place in case Nagad's sandbox disagrees.
const SIGN_ALGORITHM = 'sha256';

function baseUrl(mode) {
  return mode === 'live'
    ? 'https://api.mynagad.com/api/dfs'
    : 'http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs';
}

function toPem(base64Key, label) {
  const lines = base64Key.match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`;
}

/**
 * Nagad shows keys as a bare base64 body, merchants often paste a full PEM file instead.
 * Accepts both, and for a bare body either flavour (PKCS#8 / SPKI or the older PKCS#1).
 */
function loadKey(raw, kind) {
  const create = kind === 'private' ? crypto.createPrivateKey : crypto.createPublicKey;
  const text = String(raw ?? '').replace(/\\n/g, '\n').trim();

  const armoured = text.match(/-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/);
  const body = (armoured ? armoured[2] : text).replace(/\s+/g, '');
  if (armoured) {
    try {
      return create(toPem(body, armoured[1]));
    } catch {
      // wrong label for the body (e.g. PKCS#8 under "RSA PRIVATE KEY") — decode the body below
    }
  }
  const der = Buffer.from(body, 'base64');
  for (const type of kind === 'private' ? ['pkcs8', 'pkcs1'] : ['spki', 'pkcs1']) {
    try {
      return create({ key: der, format: 'der', type });
    } catch {
      // not that flavour — try the next one
    }
  }
  throw new Error(`Nagad ${kind === 'private' ? 'merchant private' : 'gateway public'} key is not a valid RSA key`);
}

function sign(data, privateKey) {
  return crypto.sign(SIGN_ALGORITHM, Buffer.from(data), privateKey).toString('base64');
}

function encrypt(data, publicKey) {
  return crypto.publicEncrypt(
    { key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(data)
  ).toString('base64');
}

function decrypt(base64Data, privateKey) {
  return crypto.privateDecrypt(
    { key: privateKey, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(base64Data, 'base64')
  ).toString('utf8');
}

/** Nagad's clock: yyyyMMddHHmmss in Bangladesh time (it rejects times outside its allowed window). */
function dhakaDateTime() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Dhaka',
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(new Date())
      .map(({ type, value }) => [type, value])
  );
  return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${parts.second}`;
}

/** Nagad order ids are alphanumeric, 5-20 chars — so "MRN-261016-482917" goes out as "MRN261016482917". */
export function nagadOrderId(orderNumber) {
  return String(orderNumber).replace(/[^A-Za-z0-9]/g, '');
}

/** Amount "up to two decimal point", e.g. 1790.00. */
function formatAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invalid amount for Nagad payment');
  return amount.toFixed(2);
}

function nagadHeaders(clientIp, withBody) {
  const ip = String(clientIp || '').replace(/^::ffff:/i, '');
  return {
    ...(withBody ? { 'Content-Type': 'application/json' } : { Accept: 'application/json' }),
    'X-KM-Api-Version': API_VERSION,
    'X-KM-IP-V4': net.isIPv4(ip) && ip !== '127.0.0.1' ? ip : FALLBACK_IP,
    'X-KM-Client-Type': CLIENT_TYPE,
  };
}

async function nagadRequest(url, { method = 'GET', headers, body } = {}) {
  const res = await fetch(url, { method, headers, body, signal: AbortSignal.timeout(15000) });
  try {
    return await res.json();
  } catch {
    throw new Error(`Nagad returned an unreadable response (HTTP ${res.status})`);
  }
}

export async function initPayment({ order, settings, clientIp }) {
  const gw = settings.paymentGateways.nagad;
  const privateKey = loadKey(decryptSecret(gw.merchantPrivateKey), 'private');
  const publicKey = loadKey(decryptSecret(gw.pgPublicKey), 'public');
  const merchantId = gw.merchantId;
  const orderId = nagadOrderId(order.orderNumber);
  const dateTime = dhakaDateTime();
  const headers = nagadHeaders(clientIp, true);

  // Step 1 — Initialize. (accountNumber is the optional *merchant* Nagad number, so it is left out.)
  const initSensitive = JSON.stringify({
    merchantId,
    datetime: dateTime,
    orderId,
    challenge: crypto.randomBytes(20).toString('hex').toUpperCase(),
  });
  const initBody = {
    dateTime,
    sensitiveData: encrypt(initSensitive, publicKey),
    signature: sign(initSensitive, privateKey),
  };

  const initData = await nagadRequest(`${baseUrl(gw.mode)}/check-out/initialize/${merchantId}/${orderId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(initBody),
  });
  if (!initData?.sensitiveData) {
    logger.warn('Nagad: initialize failed:', initData?.message || initData?.reason);
    throw new Error(initData?.message || 'Failed to initiate Nagad payment');
  }

  let initResult;
  try {
    initResult = JSON.parse(decrypt(initData.sensitiveData, privateKey));
  } catch {
    logger.warn('Nagad: could not decrypt the initialize response — wrong merchant private key?');
    throw new Error('Failed to initiate Nagad payment');
  }
  // The guide's response table calls it `random` (the field's old name); live servers send `challenge`.
  const paymentReferenceId = initResult.paymentReferenceId;
  const challenge = initResult.challenge ?? initResult.random;
  if (!paymentReferenceId || !challenge) {
    logger.warn('Nagad: initialize response had no paymentReferenceId/challenge');
    throw new Error('Failed to initiate Nagad payment');
  }

  // Step 2 — Place order (complete); Nagad answers with the page to send the shopper to.
  const completeSensitive = JSON.stringify({
    merchantId,
    orderId,
    currencyCode: '050',
    amount: formatAmount(order.pricing.grandTotal),
    challenge,
  });
  const completeBody = {
    sensitiveData: encrypt(completeSensitive, publicKey),
    signature: sign(completeSensitive, privateKey),
    merchantCallbackURL: `${env.apiBaseUrl}/api/v1/payments/nagad/callback`,
    additionalMerchantInfo: {
      serviceName: String(settings.storeName || 'Maroon').slice(0, 25),
      orderNumber: order.orderNumber,
    },
  };

  const completeData = await nagadRequest(`${baseUrl(gw.mode)}/check-out/complete/${paymentReferenceId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(completeBody),
  });
  if (!completeData?.callBackUrl) {
    logger.warn('Nagad: complete failed:', completeData?.message || completeData?.reason);
    throw new Error(completeData?.message || 'Failed to initiate Nagad payment');
  }

  return { redirectUrl: completeData.callBackUrl, reference: paymentReferenceId };
}

/**
 * The callback (?merchant&order_id&payment_ref_id&status&status_code&...) is only a pointer: the
 * payment counts as paid solely when Nagad's own "check payment status" answer says Success for
 * *this* order id and amount. Never throws — any failure comes back as a failed result.
 */
export async function verifyPayment({ query, settings, order, clientIp }) {
  try {
    const gw = settings.paymentGateways.nagad;
    const paymentRefId = query.payment_ref_id;
    if (typeof paymentRefId !== 'string' || !/^[\w+=-]{8,200}$/.test(paymentRefId)) {
      return { success: false, transactionId: null, raw: { error: 'Nagad callback has no valid payment_ref_id' } };
    }
    if (!order) return { success: false, transactionId: null, raw: { error: 'No order to verify the Nagad payment against' } };

    const data = await nagadRequest(`${baseUrl(gw.mode)}/verify/payment/${paymentRefId}`, {
      headers: nagadHeaders(clientIp, false),
    });
    if (!data || typeof data !== 'object' || data.reason) {
      return { success: false, transactionId: null, raw: { error: data?.message || 'Nagad could not verify the payment' } };
    }

    // Cancelled / failed / aborted / still pending — whatever Nagad says, it is not paid.
    if (String(data.status).toLowerCase() !== 'success') return { success: false, transactionId: null, raw: data };

    const sameOrder = data.orderId === nagadOrderId(order.orderNumber);
    const sameMerchant = !data.merchantId || String(data.merchantId) === String(gw.merchantId ?? '').trim();
    const sameAmount =
      Number.isFinite(Number(data.amount)) &&
      Math.round(Number(data.amount) * 100) === Math.round(Number(order.pricing.grandTotal) * 100);
    if (!sameOrder || !sameMerchant || !sameAmount) {
      logger.warn(`Nagad: verified payment does not match order ${order.orderNumber}`);
      return { success: false, transactionId: null, raw: { error: 'Nagad payment does not match this order', response: data } };
    }

    return { success: true, transactionId: data.issuerPaymentRefNo || data.issuerPaymentReferenceNo || null, raw: data };
  } catch (err) {
    logger.warn('Nagad: verify failed:', err.message);
    return { success: false, transactionId: null, raw: { error: err.message } };
  }
}
