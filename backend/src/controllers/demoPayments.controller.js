import { asyncHandler } from '../middlewares/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { demoPaymentProviderSchema } from '../validators/demoPayments.validators.js';
import { isDemoOrigin, readReceipt, settleDemoPayment, startDemoPayment } from '../services/demoPayments.service.js';

const providerOf = (req) => {
  const parsed = demoPaymentProviderSchema.safeParse(req.params.provider);
  if (!parsed.success) throw ApiError.notFound('Unknown payment method');
  return parsed.data;
};

/** Only the demo storefront itself (its page, in a visitor's browser) may start one. */
export const start = asyncHandler(async (req, res) => {
  if (!isDemoOrigin(req.get('origin'))) throw ApiError.forbidden('Demo payments can only be started from the demo store');
  const payment = await startDemoPayment(providerOf(req), req.body, req.ip);
  sendSuccess(res, { data: payment });
});

/** The gateway's return (the shopper's browser) or its server-to-server notice, which only wants a 200 — nothing is stored. */
export const callback = asyncHandler(async (req, res) => {
  const provider = providerOf(req);
  if (req.method === 'POST') return res.status(200).json({ status: 'success' });
  const redirectUrl = await settleDemoPayment(provider, req.params.token, req.query);
  if (!redirectUrl) throw ApiError.badRequest('This payment link has expired — start the payment again from the demo store');
  res.redirect(redirectUrl);
});

export const verify = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: readReceipt(req.body.receipt) });
});
