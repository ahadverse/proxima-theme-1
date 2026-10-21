import { IncompleteOrder } from '../models/IncompleteOrder.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const capture = asyncHandler(async (req, res) => {
  await IncompleteOrder.findOneAndUpdate(
    { phone: req.body.phone, status: 'pending' },
    { ...req.body, status: 'pending' },
    { upsert: true, setDefaultsOnInsert: true, new: true }
  );
  sendSuccess(res, { statusCode: 201, message: 'Captured' });
});

export const adminList = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    IncompleteOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    IncompleteOrder.countDocuments(filter),
  ]);

  sendSuccess(res, { data: items, meta: { total, page, limit, pages: Math.ceil(total / limit) } });
});

export const adminUpdateStatus = asyncHandler(async (req, res) => {
  const incompleteOrder = await IncompleteOrder.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );
  if (!incompleteOrder) throw ApiError.notFound('Incomplete order not found');
  sendSuccess(res, { message: 'Status updated', data: incompleteOrder });
});
