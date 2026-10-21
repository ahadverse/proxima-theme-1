import { User } from '../models/User.js';
import { Order } from '../models/Order.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/slugify.js';

export const list = asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (q) {
    const pattern = { $regex: escapeRegex(q), $options: 'i' };
    filter.$or = [{ name: pattern }, { phone: pattern }, { email: pattern }];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  sendSuccess(res, { data: items, meta: { total, page, limit, pages: Math.ceil(total / limit) } });
});

export const getOne = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('Customer not found');

  const orders = await Order.find({ customer: user._id })
    .sort({ createdAt: -1 })
    .select('orderNumber orderStatus paymentStatus pricing.grandTotal createdAt');

  sendSuccess(res, { data: { ...user.toObject(), orders } });
});
