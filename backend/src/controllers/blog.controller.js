import { Blog } from '../models/Blog.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex, uniqueSlug } from '../utils/slugify.js';
import { blogImageUrls, removeUnusedImages } from '../services/imageCleanup.service.js';

// ---------- Public

/** Published posts, newest first. Bodies are left out — a list only needs the card. */
export const list = asyncHandler(async (req, res) => {
  const { tag, limit } = req.query;
  const filter = { status: 'published' };
  if (tag) filter.tags = tag;

  let query = Blog.find(filter).select('-content').sort({ publishedAt: -1 });
  if (limit) query = query.limit(limit);
  sendSuccess(res, { data: await query });
});

export const getOne = asyncHandler(async (req, res) => {
  const post = await Blog.findOne({ slug: req.params.slug, status: 'published' });
  if (!post) throw ApiError.notFound('Post not found');
  sendSuccess(res, { data: post });
});

// ---------- Admin

export const adminList = asyncHandler(async (req, res) => {
  const { status, q, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (q) filter.title = { $regex: escapeRegex(q), $options: 'i' };

  const [items, total] = await Promise.all([
    Blog.find(filter)
      .select('-content')
      .populate('author', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Blog.countDocuments(filter),
  ]);

  sendSuccess(res, { data: items, meta: { total, page, limit, pages: Math.ceil(total / limit) } });
});

export const adminGetOne = asyncHandler(async (req, res) => {
  const post = await Blog.findById(req.params.id).populate('author', 'name');
  if (!post) throw ApiError.notFound('Post not found');
  sendSuccess(res, { data: post });
});

export const create = asyncHandler(async (req, res) => {
  const { slug, status = 'draft', ...fields } = req.body;
  const post = new Blog({
    ...fields,
    slug: slug ?? (await uniqueSlug(Blog, fields.title, 'post')),
    author: req.admin._id,
    status,
  });
  if (status === 'published') post.publishedAt = new Date();

  await post.save();
  sendSuccess(res, { statusCode: 201, message: 'Post created', data: post });
});

export const update = asyncHandler(async (req, res) => {
  const post = await Blog.findById(req.params.id);
  if (!post) throw ApiError.notFound('Post not found');

  Object.assign(post, req.body);
  // The date a post goes live is stamped once — unpublishing and re-publishing keeps it.
  if (post.status === 'published' && !post.publishedAt) post.publishedAt = new Date();

  await post.save();
  sendSuccess(res, { message: 'Post updated', data: post });
});

function setStatus(status) {
  return asyncHandler(async (req, res) => {
    const post = await Blog.findById(req.params.id);
    if (!post) throw ApiError.notFound('Post not found');

    post.status = status;
    if (status === 'published' && !post.publishedAt) post.publishedAt = new Date();

    await post.save();
    sendSuccess(res, { message: status === 'published' ? 'Post published' : 'Post unpublished', data: post });
  });
}

export const publish = setStatus('published');
export const unpublish = setStatus('draft');

export const remove = asyncHandler(async (req, res) => {
  const post = await Blog.findByIdAndDelete(req.params.id);
  if (!post) throw ApiError.notFound('Post not found');
  // The cover and the pictures in its text are deleted from storage too (unless something else still uses them).
  void removeUnusedImages(blogImageUrls(post));
  sendSuccess(res, { message: 'Post deleted' });
});
