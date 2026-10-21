import { Category } from '../models/Category.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { toSlug } from '../utils/slugify.js';

export const list = asyncHandler(async (req, res) => {
  // By default only top-level categories are returned (what the site nav needs).
  // Pass ?all=true to get the full flat tree, including subcategories.
  const filter = req.query.all === 'true' ? {} : { status: 'active', parent: null };
  const categories = await Category.find(filter).sort({ sortOrder: 1, name: 1 });
  sendSuccess(res, { data: categories });
});

export const getOne = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug });
  if (!category) throw ApiError.notFound('Category not found');
  sendSuccess(res, { data: category });
});

export const create = asyncHandler(async (req, res) => {
  const slug = req.body.slug ? toSlug(req.body.slug) : toSlug(req.body.name);
  // A new category goes to the end of its menu (or of its parent's subcategories) unless it was given a place.
  let { sortOrder } = req.body;
  if (sortOrder === undefined) {
    const last = await Category.findOne({ parent: req.body.parent ?? null }).sort({ sortOrder: -1 }).select('sortOrder');
    sortOrder = last ? last.sortOrder + 1 : 0;
  }
  const category = await Category.create({ ...req.body, slug, sortOrder });
  sendSuccess(res, { statusCode: 201, message: 'Category created', data: category });
});

/**
 * Drag-and-drop ordering: the admin sends the ids of one set of siblings (the top-level categories, or one category's
 * subcategories) in the order they should appear, and each gets its position. The storefront's menu follows it.
 */
export const reorder = asyncHandler(async (req, res) => {
  const { ids, parent = null } = req.body;
  const categories = await Category.find({ _id: { $in: ids } }).select('parent');
  if (categories.length !== ids.length) throw ApiError.badRequest('One of those categories no longer exists — reload the page');
  if (categories.some((c) => String(c.parent ?? null) !== String(parent))) {
    throw ApiError.badRequest('Only categories with the same parent can be ordered together');
  }

  await Category.bulkWrite(ids.map((id, index) => ({ updateOne: { filter: { _id: id }, update: { $set: { sortOrder: index } } } })));
  sendSuccess(res, { message: 'Order saved' });
});

export const update = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (payload.slug) payload.slug = toSlug(payload.slug);

  const category = await Category.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });
  if (!category) throw ApiError.notFound('Category not found');
  sendSuccess(res, { message: 'Category updated', data: category });
});

export const remove = asyncHandler(async (req, res) => {
  const hasChildren = await Category.exists({ parent: req.params.id });
  if (hasChildren) throw ApiError.badRequest('Remove or reassign subcategories first');

  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');
  sendSuccess(res, { message: 'Category deleted' });
});
