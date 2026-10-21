import { Brand } from '../models/Brand.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { toSlug } from '../utils/slugify.js';

export const list = asyncHandler(async (req, res) => {
  const filter = req.query.all === 'true' ? {} : { status: 'active' };
  const brands = await Brand.find(filter).sort({ sortOrder: 1, name: 1 });
  sendSuccess(res, { data: brands });
});

export const getOne = asyncHandler(async (req, res) => {
  const brand = await Brand.findOne({ slug: req.params.slug });
  if (!brand) throw ApiError.notFound('Brand not found');
  sendSuccess(res, { data: brand });
});

export const create = asyncHandler(async (req, res) => {
  const slug = req.body.slug ? toSlug(req.body.slug) : toSlug(req.body.name);
  // A new brand goes to the end of the list unless it was given a place.
  let { sortOrder } = req.body;
  if (sortOrder === undefined) {
    const last = await Brand.findOne().sort({ sortOrder: -1 }).select('sortOrder');
    sortOrder = last ? last.sortOrder + 1 : 0;
  }
  const brand = await Brand.create({ ...req.body, slug, sortOrder });
  sendSuccess(res, { statusCode: 201, message: 'Brand created', data: brand });
});

/** Drag-and-drop ordering: every brand's id in the order it should appear (the home page's "Shop by Brand" follows it). */
export const reorder = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if ((await Brand.countDocuments({ _id: { $in: ids } })) !== ids.length) {
    throw ApiError.badRequest('One of those brands no longer exists — reload the page');
  }

  await Brand.bulkWrite(ids.map((id, index) => ({ updateOne: { filter: { _id: id }, update: { $set: { sortOrder: index } } } })));
  sendSuccess(res, { message: 'Order saved' });
});

export const update = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (payload.slug) payload.slug = toSlug(payload.slug);

  const brand = await Brand.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!brand) throw ApiError.notFound('Brand not found');
  sendSuccess(res, { message: 'Brand updated', data: brand });
});

export const remove = asyncHandler(async (req, res) => {
  const brand = await Brand.findByIdAndDelete(req.params.id);
  if (!brand) throw ApiError.notFound('Brand not found');
  sendSuccess(res, { message: 'Brand deleted' });
});
