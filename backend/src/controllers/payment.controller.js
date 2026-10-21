import { asyncHandler } from '../middlewares/asyncHandler.js';
import { env } from '../config/env.js';
import { getSettingsDoc } from '../services/settings.service.js';
import { getProvider } from '../services/payments/index.js';
import * as orderService from '../services/order.service.js';

// Hit directly by the payment gateway's browser redirect (GET) and/or its server-to-server notification
// (POST, e.g. PayStation's IPN) — no auth, identifies the order from the params the gateway itself sends
// back. Anyone can request this URL, so it only ever moves an order *toward* paid, and only on the
// gateway's own confirmation.
export const callback = asyncHandler(async (req, res) => {
  const provider = getProvider(req.params.provider);

  // An IPN has no shopper to redirect: its params arrive in the body and it only wants a 200 back.
  const isIpn = req.method === 'POST';
  const body = isIpn && req.body && typeof req.body === 'object' ? req.body : {};
  const query = { ...body, ...req.query, ...(req.params.ref ? { invoice: req.params.ref } : {}) };
  const order = await orderService.findOrderForPaymentCallback(query);
  const reply = (redirectUrl) => (isIpn ? res.status(200).json({ status: 'success' }) : res.redirect(redirectUrl));

  // A callback that can't be honoured sends the shopper to their order's page with the payment marked
  // failed (the page offers to try again); if the order isn't even known, to the home page.
  const toError = () =>
    reply(
      order
        ? `${env.clientUrl}/order-confirmation/${encodeURIComponent(order.orderNumber)}?payment=failed`
        : `${env.clientUrl}/?payment=error`
    );
  // The order must have been placed with this very gateway.
  if (!provider?.verifyPayment || !order || order.paymentMethod !== provider.key) return toError();

  const toConfirmation = (status) =>
    reply(
      `${env.clientUrl}/order-confirmation/${encodeURIComponent(order.orderNumber)}?payment=${status}&value=${order.pricing.grandTotal}&currency=BDT`
    );

  // Meta wants the shopper's own address and user agent, which only the browser's redirect has; an IPN
  // comes from the gateway's servers, so it never reports the purchase and the browser's visit still can.
  const reportPurchase = () =>
    isIpn ? null : orderService.reportPaidPurchase(order, { ip: req.ip, userAgent: req.get('user-agent') });

  // Already confirmed stays confirmed: a refresh, the gateway's retry, or somebody opening the
  // "cancelled" link for a paid order must not undo it.
  if (order.paymentStatus === 'paid') {
    await reportPurchase();
    return toConfirmation('success');
  }

  // The callback has to be for the payment that was started for this order, not some other
  // successful payment someone is trying to attach to it.
  const reference = [query.paymentID, query.paymentId, query.payment_ref_id].find((v) => typeof v === 'string' && v);
  const started = order.paymentDetails?.transactionId;
  if (reference && started && reference !== started) return toError();

  const settings = await getSettingsDoc();
  const result = await provider.verifyPayment({ query, settings, order, clientIp: req.ip });
  await orderService.applyPaymentResult(order, result);
  if (result.success) await reportPurchase();

  toConfirmation(result.success ? 'success' : 'failed');
});
