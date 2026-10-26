import { createReviewSchema, adminReviewQuerySchema } from '../backend/validators/review.validators.js';
import { requireAdmin, requireCustomer } from '../auth';
import type { Tx } from '../db';
import { ApiError } from '../errors';
import { ok, type Router } from '../http';
import { ref } from '../populate';
import { assertId, create } from '../schemas';
import { paginate, sortDocs } from '../util';
import { validate } from '../validate';

/** Reviews — review.controller.js and review.service.js. */

function recomputeProductRating(tx: Tx, productId: string) {
  const approved = tx.all('reviews').filter((r) => r.product === productId && r.isApproved);
  const product = tx.edit('products', productId);
  if (!product) return;
  product.ratingsAverage = approved.length ? approved.reduce((sum, r) => sum + r.rating, 0) / approved.length : 0;
  product.ratingsCount = approved.length;
}

export function reviewRoutes(router: Router) {
  /** What shoppers see: who wrote it, and whether they bought the product (a delivered order containing it). */
  router.get('/products/:productId/reviews', ({ db, params }) => {
    assertId(params.productId, 'product');
    const reviews = sortDocs(
      db.filter('reviews', (r) => r.product === params.productId && r.isApproved),
      { createdAt: -1 }
    );
    const buyers = new Set(
      db
        .filter(
          'orders',
          (o) => o.customer && o.orderStatus === 'delivered' && o.items.some((i: { product: string }) => i.product === params.productId)
        )
        .map((o) => o.customer)
    );
    return ok(
      reviews.map((r) => ({
        _id: r._id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        createdAt: r.createdAt,
        customer: { name: db.get('users', r.customer)?.name ?? 'Customer' },
        isVerifiedPurchase: buyers.has(r.customer),
      }))
    );
  });

  router.post('/products/:productId/reviews', (ctx) => {
    const customer = requireCustomer(ctx.db);
    const { rating, title, comment } = validate(createReviewSchema, ctx.body);
    assertId(ctx.params.productId);
    return ctx.write((tx) => {
      const product = tx.get('products', ctx.params.productId);
      if (!product) throw ApiError.notFound('Product not found');
      if (tx.all('reviews').some((r) => r.product === product._id && r.customer === customer._id)) {
        throw ApiError.conflict('You have already reviewed this product');
      }
      // isApproved starts false — the review goes live once an admin approves it.
      const review = tx.insert('reviews', create('reviews', { product: product._id, customer: customer._id, rating, title, comment }));
      tx.note('review.submitted', { product: product.title, rating });
      return ok(review, { status: 201, message: 'Review submitted' });
    });
  });

  router.get('/reviews', ({ db, query }) => {
    requireAdmin(db);
    const { isApproved, page = 1, limit = 20 } = validate(adminReviewQuerySchema, query);
    const wanted = isApproved === undefined ? null : isApproved === 'true';
    const reviews = sortDocs(
      db.filter('reviews', (r) => wanted === null || r.isApproved === wanted),
      { createdAt: -1 }
    );
    const { items, meta } = paginate(reviews, page, limit);
    return ok(
      items.map((r) => ({
        ...r,
        customer: ref(db, 'users', r.customer, ['name', 'phone']),
        product: ref(db, 'products', r.product, ['title', 'slug']),
      })),
      { meta }
    );
  });

  router.patch('/reviews/:id/approve', (ctx) => {
    requireAdmin(ctx.db);
    assertId(ctx.params.id);
    return ctx.write((tx) => {
      const review = tx.edit('reviews', ctx.params.id);
      if (!review) throw ApiError.notFound('Review not found');
      review.isApproved = true;
      recomputeProductRating(tx, review.product);
      return ok(review, { message: 'Review approved' });
    });
  });

  router.delete('/reviews/:id', (ctx) => {
    requireAdmin(ctx.db);
    assertId(ctx.params.id);
    return ctx.write((tx) => {
      const review = tx.remove('reviews', ctx.params.id);
      if (!review) throw ApiError.notFound('Review not found');
      recomputeProductRating(tx, review.product);
      return ok(null, { message: 'Review removed' });
    });
  });
}
