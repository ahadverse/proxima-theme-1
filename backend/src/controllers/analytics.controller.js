import { asyncHandler } from '../middlewares/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { ensureSessionId } from '../utils/sessionCookie.js';
import * as analytics from '../services/analytics.service.js';

/** Public: the storefront reports a product view or an add-to-cart. Fire-and-forget on the client's side. */
export const track = asyncHandler(async (req, res) => {
  const { type, product, variantSku, quantity } = req.body;
  const sessionId = ensureSessionId(req, res);

  const result = await analytics.trackEvent({ type, productId: product, variantSku, quantity, sessionId });
  if (result.reason === 'not_found') throw ApiError.notFound('Product not found');

  sendSuccess(res, { statusCode: 202, message: 'Accepted', data: { recorded: result.recorded } });
});

export const overview = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await analytics.getOverview(req.query) });
});

export const products = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await analytics.getProductPerformance(req.query) });
});

export const categories = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await analytics.getCategoryBreakdown(req.query) });
});

export const funnel = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await analytics.getFunnel(req.query) });
});
