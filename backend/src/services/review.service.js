import { Review } from '../models/Review.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { ApiError } from '../utils/ApiError.js';

async function recomputeProductRating(productId) {
  const [stats] = await Review.aggregate([
    { $match: { product: productId, isApproved: true } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  await Product.updateOne(
    { _id: productId },
    { ratingsAverage: stats?.average ?? 0, ratingsCount: stats?.count ?? 0 }
  );
}

/**
 * The approved reviews for a product, in the shape shoppers see: no ids or moderation fields, just
 * who wrote it (first name only is enough — the whole name is as much as the storefront shows) and
 * whether they actually bought the product (a delivered order containing it).
 */
export async function listApprovedReviews(productId) {
  const reviews = await Review.find({ product: productId, isApproved: true })
    .sort({ createdAt: -1 })
    .populate('customer', 'name')
    .lean();

  const reviewerIds = reviews.map((r) => r.customer?._id).filter(Boolean);
  const buyers = reviewerIds.length
    ? new Set(
        (
          await Order.distinct('customer', {
            customer: { $in: reviewerIds },
            'items.product': productId,
            orderStatus: 'delivered',
          })
        ).map(String)
      )
    : new Set();

  return reviews.map((r) => ({
    _id: r._id,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    createdAt: r.createdAt,
    customer: { name: r.customer?.name ?? 'Customer' },
    isVerifiedPurchase: buyers.has(String(r.customer?._id)),
  }));
}

export async function createReview(productId, customer, { rating, title, comment }) {
  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound('Product not found');

  let review;
  try {
    review = await Review.create({
      product: productId,
      customer: customer._id,
      rating,
      title,
      comment,
      // isApproved defaults to false — goes live once an admin approves it.
    });
  } catch (err) {
    if (err.code === 11000) throw ApiError.conflict('You have already reviewed this product');
    throw err;
  }

  return review;
}

export async function listAllReviews({ isApproved, page = 1, limit = 20 } = {}) {
  const filter = {};
  if (isApproved !== undefined) filter.isApproved = isApproved === 'true' || isApproved === true;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('customer', 'name phone')
      .populate('product', 'title slug'),
    Review.countDocuments(filter),
  ]);

  return { items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

export async function approveReview(id) {
  const review = await Review.findByIdAndUpdate(id, { isApproved: true }, { new: true });
  if (!review) throw ApiError.notFound('Review not found');
  await recomputeProductRating(review.product);
  return review;
}

export async function deleteReview(id) {
  const review = await Review.findByIdAndDelete(id);
  if (!review) throw ApiError.notFound('Review not found');
  await recomputeProductRating(review.product);
}
