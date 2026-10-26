import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { getSettingsDoc } from './settings.service.js';
import { getProvider } from './payments/index.js';

/**
 * Payments for the browser-only live demo (docs/DEMO_MODE_PLAN.md §4.7). A demo order exists only in the visitor's browser
 * and a browser can't hold a gateway's credentials, so this starts the payment on the gateway's SANDBOX, takes the
 * gateway's return, checks the payment with the gateway as the real callback does, and sends the shopper back to the demo
 * store with a signed receipt — which the demo store has checked here (verify) before it marks its order paid.
 *
 * Nothing is stored. What ties the steps together is signed: a ticket in the return address (which order, how much, which
 * demo store to go back to) and the receipt. Only the demo storefront's own address may start a payment, only a gateway
 * set to sandbox is ever used, and amounts are capped.
 */

const TICKET_TTL_MS = 2 * 60 * 60 * 1000;
const RECEIPT_TTL_MS = 24 * 60 * 60 * 1000;

export const isDemoPaymentsEnabled = () => env.demoPayments.origins.length > 0;
export const isDemoOrigin = (origin) => typeof origin === 'string' && env.demoPayments.origins.includes(origin);

const signingKey = () =>
  crypto.createHmac('sha256', env.demoPayments.secret || env.jwtSecret).update('maroon-demo-payments').digest();
const mac = (body) => crypto.createHmac('sha256', signingKey()).update(body).digest('base64url');

// `kind` is signed into every token so a receipt can never be passed off as a ticket, or the other way round.
function sign(kind, payload) {
  const body = Buffer.from(JSON.stringify({ ...payload, k: kind, t: Date.now() })).toString('base64url');
  return `${body}.${mac(body)}`;
}

/** The payload of a token of this `kind` that this service signed, or null — forged, altered, too old or another kind. */
function open(kind, token, maxAgeMs) {
  if (typeof token !== 'string') return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = Buffer.from(mac(body));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return payload.k === kind && Date.now() - payload.t <= maxAgeMs ? payload : null;
  } catch {
    return null;
  }
}

/** A gateway that can take a demo payment: switched on, set up — and on its sandbox, never live. */
function sandboxGateway(key, settings) {
  const provider = getProvider(key);
  const gw = settings.paymentGateways?.[key];
  if (!provider?.initPayment || !gw?.enabled || !provider.isConfigured(settings.paymentGateways)) {
    throw ApiError.badRequest('No sandbox is set up for this payment method');
  }
  if (gw.mode !== 'sandbox') throw ApiError.badRequest("Demo payments only run on a gateway's sandbox");
  return provider;
}

/** What the gateway modules read from an order, for one that only exists in a visitor's browser. */
const standInOrder = ({ key, orderNumber, amount, name, phone, email, reference }) => ({
  orderNumber,
  paymentMethod: key,
  pricing: { grandTotal: amount },
  guestInfo: { name, email },
  shippingAddress: { phone },
  paymentDetails: { transactionId: reference },
});

export async function startDemoPayment(key, { orderNumber, amount, name, phone, email, returnUrl }, clientIp) {
  const returnOrigin = new URL(returnUrl).origin;
  if (!isDemoOrigin(returnOrigin)) throw ApiError.forbidden('Payments can only return to the demo store');
  if (amount > env.demoPayments.maxAmount) {
    throw ApiError.badRequest(`Demo payments are limited to ৳${env.demoPayments.maxAmount.toLocaleString('en-US')}`);
  }

  const settings = await getSettingsDoc();
  const provider = sandboxGateway(key, settings);
  const ticket = sign('ticket', { p: key, o: orderNumber, a: amount, r: returnOrigin });
  const { redirectUrl, reference } = await provider.initPayment({
    order: standInOrder({ key, orderNumber, amount, name, phone, email }),
    settings,
    clientIp,
    callbackUrl: `${env.apiBaseUrl}/api/v1/demo-payments/${key}/callback/${ticket}`,
  });
  return { redirectUrl, reference };
}

const text = (value) => (typeof value === 'string' && value.length > 0 && value.length <= 200 ? value : null);

/**
 * The gateway's return. Checked with the gateway itself (the callback's own "status" is never trusted), then the shopper is
 * sent back to the demo store's confirmation page with the signed result. Null when the ticket isn't one of ours.
 */
export async function settleDemoPayment(key, ticketToken, query) {
  const ticket = open('ticket', ticketToken, TICKET_TTL_MS);
  if (!ticket || ticket.p !== key) return null;

  const settings = await getSettingsDoc();
  const provider = sandboxGateway(key, settings);
  // What the demo store's order remembers about the payment it started: PayStation's invoice, bKash's or Nagad's id.
  const reference = text(query.invoice_number) || text(query.paymentID) || text(query.paymentId) || text(query.payment_ref_id);
  let result = { success: false, transactionId: null };
  try {
    result = await provider.verifyPayment({
      query,
      settings,
      order: standInOrder({ key, orderNumber: ticket.o, amount: ticket.a, reference }),
    });
  } catch (err) {
    logger.warn(`Demo payment ${ticket.o}: verification failed:`, err.message);
  }

  const receipt = sign('receipt', { o: ticket.o, ref: reference, a: ticket.a, s: Boolean(result.success), x: result.transactionId ?? null, p: key });
  const number = encodeURIComponent(ticket.o);
  const outcome = result.success ? `payment=success&value=${ticket.a}&currency=BDT` : 'payment=failed';
  return `${ticket.r}/order-confirmation/${number}?${outcome}&demoReceipt=${receipt}`;
}

/** What a receipt says, for the demo store to settle its order with — or a 400 if it isn't one this service issued. */
export function readReceipt(receipt) {
  const data = open('receipt', receipt, RECEIPT_TTL_MS);
  if (!data) throw ApiError.badRequest('This payment receipt is not valid');
  return { orderNumber: data.o, reference: data.ref, amount: data.a, success: data.s, transactionId: data.x, provider: data.p };
}
