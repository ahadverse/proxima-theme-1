import { Coupon } from '../models/Coupon.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/slugify.js';
import { evaluateCoupon } from '../services/coupon.service.js';

/**
 * Public: does this code work for a cart with this subtotal, and what would it take off? Nothing is
 * redeemed here — that happens when the order is placed, which re-checks everything.
 */
export const validateCode = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body;
  const { coupon, discount } = await evaluateCoupon(code, subtotal);

  sendSuccess(res, {
    message: 'Coupon applied',
    data: { code: coupon.code, type: coupon.type, value: coupon.value, discount },
  });
});

export const list = asyncHandler(async (req, res) => {
  const { status, q, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (q) filter.code = { $regex: escapeRegex(q), $options: 'i' };

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Coupon.countDocuments(filter),
  ]);

  sendSuccess(res, { data: items, meta: { total, page, limit, pages: Math.ceil(total / limit) } });
});

export const create = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create(req.body);
  sendSuccess(res, { statusCode: 201, message: 'Coupon created', data: coupon });
});

export const update = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!coupon) throw ApiError.notFound('Coupon not found');
  sendSuccess(res, { message: 'Coupon updated', data: coupon });
});

export const remove = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw ApiError.notFound('Coupon not found');
  sendSuccess(res, { message: 'Coupon deleted' });
});
