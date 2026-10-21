import { decryptSecret } from '../../utils/encryption.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

// PayStation publishes no timeout of its own; a gateway call must never hang the shopper's request.
const TIMEOUT_MS = 15000;

// https://paystation.com.bd/documentation ("Environment"): sandbox and live are separate hosts, and each has
// its own Merchant ID / password — sandbox credentials do not work on the live host or the other way round.
function baseUrl(mode) {
  return mode === 'live' ? 'https://api.paystation.com.bd' : 'https://sandbox.paystation.com.bd';
}

// payment_amount is documented as an integer, so a whole-taka total is sent without decimals.
const amountString = (n) => String(Number(Number(n).toFixed(2)));

// PayStation refuses a repeated invoice_number (1008 "Duplicate invoice number."), which would stop a shopper
// retrying a failed or cancelled payment. So every attempt gets its own invoice, "<orderNumber>-<attempt>",
// the way the Biye Kora Lagbe backend does (a fresh id per attempt); the prefix keeps it tied to its order.
const invoiceFor = (order) => `${order.orderNumber}-${Date.now().toString(36)}`;
const belongsTo = (order, invoice) =>
  typeof invoice === 'string' && (invoice === order.orderNumber || invoice.startsWith(`${order.orderNumber}-`));

// https://paystation.com.bd/documentation ("Hosted Checkout"): POST /initiate-payment as a form body with
// merchantId + password (no API key). PayStation takes ONE callback_url and appends status, invoice_number
// and trx_id to it (see the official plugin, github.com/Pay-Station/pgw-wp-plugin). The order number is also
// put in the callback's path, so finding the order never depends on what PayStation appends.
export async function initPayment({ order, settings }) {
  const gw = settings.paymentGateways.paystation;
  const invoice = invoiceFor(order);

  const res = await fetch(`${baseUrl(gw.mode)}/initiate-payment`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: new URLSearchParams({
      merchantId: gw.merchantId,
      password: decryptSecret(gw.password),
      invoice_number: invoice,
      currency: 'BDT',
      payment_amount: amountString(order.pricing.grandTotal),
      pay_with_charge: '0',
      cust_name: order.guestInfo?.name || 'Customer',
      cust_phone: order.shippingAddress.phone,
      // cust_email is required by PayStation, but logged-in orders carry no email.
      cust_email: order.guestInfo?.email || settings.supportEmail || 'noreply@example.com',
      callback_url: `${env.apiBaseUrl}/api/v1/payments/paystation/callback/${encodeURIComponent(order.orderNumber)}`,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  // status_code "200" means success; anything else (e.g. 1008 "Duplicate invoice number.") is a failure.
  const data = await res.json();
  if (String(data.status_code) !== '200' || !data.payment_url) {
    logger.warn('PayStation: create payment failed:', data.status_code, data.message);
    throw new Error(data.message || 'Failed to initiate PayStation payment');
  }

  return { redirectUrl: data.payment_url, reference: data.invoice_number || invoice };
}

// The callback's own `status` is never trusted: the invoice is always re-checked server-to-server via
// POST /transaction-status ("Transaction Status v1"), and the confirmed amount must equal what the order
// costs. The invoice checked is one of OUR order's (the one named in the callback, else the one last
// started), so an old attempt that gets paid late still settles the order.
export async function verifyPayment({ query, settings, order }) {
  const gw = settings.paymentGateways.paystation;
  if (!order) return { success: false, transactionId: null, raw: query };
  const invoice = [query?.invoice_number, order.paymentDetails?.transactionId].find((v) => belongsTo(order, v)) || order.orderNumber;

  try {
    const res = await fetch(`${baseUrl(gw.mode)}/transaction-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', merchantId: gw.merchantId },
      body: JSON.stringify({ invoice_number: invoice }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const data = await res.json();
    const trx = data.data || {};

    // trx_status is documented as processing | success | failed | refund (spelled "Success" / "successful"
    // in other places of the same docs and plugin), so the match ignores case.
    const paid = String(data.status_code) === '200' && /^success(ful)?$/i.test(trx.trx_status ?? '');
    if (!paid) return { success: false, transactionId: null, raw: data };

    const expected = order.pricing.grandTotal;
    const confirmed = Number(trx.payment_amount);
    if (!(Math.abs(confirmed - expected) < 0.005) || (trx.invoice_number && trx.invoice_number !== invoice)) {
      logger.warn(`PayStation: ${order.orderNumber} confirmed ${trx.payment_amount} for ${trx.invoice_number}, expected ${expected}`);
      return {
        success: false,
        transactionId: null,
        raw: { ...data, error: `Amount mismatch: gateway confirmed ${trx.payment_amount}, order total is ${expected}` },
      };
    }

    return { success: true, transactionId: trx.trx_id || null, raw: data };
  } catch (err) {
    logger.warn('PayStation: verify failed:', err.message);
    return { success: false, transactionId: null, raw: { error: err.message } };
  }
}
