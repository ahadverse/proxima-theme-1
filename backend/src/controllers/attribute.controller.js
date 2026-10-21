import { Attribute } from '../models/Attribute.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { toSlug } from '../utils/slugify.js';

export const list = asyncHandler(async (req, res) => {
  const attributes = await Attribute.find().sort({ name: 1 });
  sendSuccess(res, { data: attributes });
});

export const create = asyncHandler(async (req, res) => {
  const slug = req.body.slug ? toSlug(req.body.slug) : toSlug(req.body.name);
  const attribute = await Attribute.create({ ...req.body, slug });
  sendSuccess(res, { statusCode: 201, message: 'Attribute created', data: attribute });
});

export const update = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (payload.slug) payload.slug = toSlug(payload.slug);

  const attribute = await Attribute.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });
  if (!attribute) throw ApiError.notFound('Attribute not found');
  sendSuccess(res, { message: 'Attribute updated', data: attribute });
});

export const remove = asyncHandler(async (req, res) => {
  const attribute = await Attribute.findByIdAndDelete(req.params.id);
  if (!attribute) throw ApiError.notFound('Attribute not found');
  sendSuccess(res, { message: 'Attribute deleted' });
});
