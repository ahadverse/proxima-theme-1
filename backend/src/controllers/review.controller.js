import { asyncHandler } from '../middlewares/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as reviewService from '../services/review.service.js';

export const list = asyncHandler(async (req, res) => {
  const reviews = await reviewService.listApprovedReviews(req.params.productId);
  sendSuccess(res, { data: reviews });
});

export const create = asyncHandler(async (req, res) => {
  const review = await reviewService.createReview(req.params.productId, req.user, req.body);
  sendSuccess(res, { statusCode: 201, message: 'Review submitted', data: review });
});

export const adminList = asyncHandler(async (req, res) => {
  const { items, meta } = await reviewService.listAllReviews(req.query);
  sendSuccess(res, { data: items, meta });
});

export const approve = asyncHandler(async (req, res) => {
  const review = await reviewService.approveReview(req.params.id);
  sendSuccess(res, { message: 'Review approved', data: review });
});

export const remove = asyncHandler(async (req, res) => {
  await reviewService.deleteReview(req.params.id);
  sendSuccess(res, { message: 'Review removed' });
});
