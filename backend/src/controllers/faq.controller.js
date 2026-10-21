import { Faq } from '../models/Faq.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const list = asyncHandler(async (req, res) => {
  const filter = req.query.all === 'true' ? {} : { status: 'active' };
  const faqs = await Faq.find(filter).sort({ sortOrder: 1 });
  sendSuccess(res, { data: faqs });
});

/** Admin: every question, including the inactive ones the storefront hides. */
export const adminList = asyncHandler(async (req, res) => {
  const faqs = await Faq.find().sort({ sortOrder: 1, createdAt: 1 });
  sendSuccess(res, { data: faqs });
});

export const create = asyncHandler(async (req, res) => {
  const faq = await Faq.create(req.body);
  sendSuccess(res, { statusCode: 201, message: 'FAQ created', data: faq });
});

export const update = asyncHandler(async (req, res) => {
  const faq = await Faq.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!faq) throw ApiError.notFound('FAQ not found');
  sendSuccess(res, { message: 'FAQ updated', data: faq });
});

export const remove = asyncHandler(async (req, res) => {
  const faq = await Faq.findByIdAndDelete(req.params.id);
  if (!faq) throw ApiError.notFound('FAQ not found');
  sendSuccess(res, { message: 'FAQ deleted' });
});
