import {
  productSchema,
  featuredQuerySchema,
  productQuerySchema,
  productAdminQuerySchema,
  stockAdjustSchema,
} from '../backend/validators/catalog.validators.js';
import { requireAdmin } from '../auth';
import type { Database, Tx } from '../db';
import { ApiError } from '../errors';
import { ok, type Router } from '../http';
import { toSlug } from '../lib/slug';
import { matchesText, parseTextQuery } from '../lib/textSearch';
import { presentProduct } from '../populate';
import { assertId, assertRef, assertUnique, create } from '../schemas';
import type { Doc } from '../types';
import { paginate, sortDocs, type SortSpec } from '../util';
import { validate } from '../validate';
import { markProgress } from './progress';
import { putBackStock, recomputeStockStatus, takeStock } from './stock';

/** Products — product.controller.js and product.service.js. */

const TEXT_FIELDS = ['title', 'description'];

const storefront = (db: Database) => (product: Doc) => presentProduct(db, product, 'storefront');

/** A category and its direct subcategories (resolveCategoryAndDescendants). */
function categoryAndChildren(db: Database, slug: string): Set<string> {
  const category = db.find('categories', (c) => c.slug === slug);
  if (!category) return new Set();
  return new Set([category._id, ...db.filter('categories', (c) => c.parent === category._id).map((c) => c._id)]);
}

const STOREFRONT_SORT: Record<string, SortSpec> = {
  newest: { createdAt: -1 },
  price_asc: { basePrice: 1 },
  price_desc: { basePrice: -1 },
  rating: { ratingsAverage: -1 },
  trending: { purchaseCount: -1 },
};

const ADMIN_SORT: Record<string, SortSpec> = {
  newest: { createdAt: -1 },
  price_asc: { basePrice: 1 },
  price_desc: { basePrice: -1 },
};

const FEATURED_FLAGS: Record<string, string> = {
  'flash-sale': 'isFlashSale',
  trending: 'isTrending',
  'new-arrivals': 'isNewArrival',
  'best-sellers': 'isBestSeller',
};

/** How much of the compare-at price a product saves, 0–1. */
function discountRatio(product: Doc) {
  const { basePrice, compareAtPrice } = product;
  return compareAtPrice > basePrice ? (compareAtPrice - basePrice) / compareAtPrice : 0;
}

/** A mongoose cast of a date field: what was sent, as the ISO string the API's JSON would give back. */
const toDate = (value: unknown) => (typeof value === 'string' ? new Date(value).toISOString() : value);

/** A variable product is listed at its cheapest variant — the price a shopper sees has to be one they can buy it at. */
function priceByCheapestVariant<T extends Record<string, unknown>>(data: T): T {
  const variants = data.variants as Doc[] | undefined;
  if (data.productType !== 'variable' || !Array.isArray(variants) || variants.length === 0) return data;
  const cheapest = variants.reduce((a, b) => (b.price < a.price ? b : a));
  return { ...data, basePrice: cheapest.price, compareAtPrice: cheapest.compareAtPrice };
}

/** The stock a product (or a new variant) came into existence with, in the inventory log. */
function initialStockLogs(tx: Tx, product: Doc, variants: Doc[]) {
  if (product.productType !== 'variable' && product.stock > 0) {
    tx.insert('inventorylogs', create('inventorylogs', {
      product: product._id,
      changeType: 'restock',
      quantityChange: product.stock,
      resultingStock: product.stock,
      note: 'Initial stock on product creation',
    }));
  }
  for (const variant of variants) {
    if (variant.stock > 0) {
      tx.insert('inventorylogs', create('inventorylogs', {
        product: product._id,
        variantSku: variant.sku,
        changeType: 'restock',
        quantityChange: variant.stock,
        resultingStock: variant.stock,
        note: 'Initial stock on product creation',
      }));
    }
  }
}

/** Every reference in a product form must be an id Mongoose can cast. */
function assertProductRefs(data: Record<string, unknown>) {
  assertRef(data.category, 'category');
  assertRef(data.brand, 'brand');
  for (const id of (data.attributesUsed as unknown[] | undefined) ?? []) assertRef(id, 'attributesUsed');
  for (const variant of (data.variants as Doc[] | undefined) ?? []) {
    for (const attribute of variant.attributes ?? []) assertRef(attribute.attribute, 'variants.attributes.attribute');
  }
}

export function productRoutes(router: Router) {
  // Literal paths first — before the dynamic GET /products/:slug, as in product.routes.js.
  for (const type of Object.keys(FEATURED_FLAGS)) {
    router.get(`/products/${type}`, ({ db, query }) => {
      const { limit = 10, sort = 'newest' } = validate(featuredQuerySchema, query);
      const now = new Date().toISOString();
      const shelf = db.filter(
        'products',
        (p) =>
          p.status === 'active' &&
          p[FEATURED_FLAGS[type]] === true &&
          // A flash sale that has run out its clock is no longer on the shelf (one with no end date runs until switched off).
          (type !== 'flash-sale' || p.flashSaleEndsAt === null || p.flashSaleEndsAt === undefined || p.flashSaleEndsAt > now)
      );
      let items: Doc[];
      if (sort === 'value') {
        items = sortDocs(shelf, { createdAt: -1 })
          .slice(0, 200)
          .sort((a, b) => discountRatio(b) - discountRatio(a))
          .slice(0, limit);
      } else {
        const order: SortSpec = sort === 'popular' ? { purchaseCount: -1, ratingsCount: -1, createdAt: -1 } : { createdAt: -1 };
        items = sortDocs(shelf, order).slice(0, limit);
      }
      return ok(items.map(storefront(db)));
    });
  }

  router.get('/products/manage', ({ db, query }) => {
    requireAdmin(db);
    const { category, brand, q, status, sort, page = 1, limit = 20 } = validate(productAdminQuerySchema, query);
    if (category) assertId(category, 'category');
    if (brand) assertId(brand, 'brand');
    const text = q ? parseTextQuery(q) : null;
    const products = db.filter(
      'products',
      (p) =>
        (!status || p.status === status) &&
        (!category || p.category === category) &&
        (!brand || p.brand === brand) &&
        (!text || matchesText(p, TEXT_FIELDS, text))
    );
    const { items, meta } = paginate(sortDocs(products, ADMIN_SORT[sort as string] ?? ADMIN_SORT.newest), page, limit);
    return ok(items.map((p) => presentProduct(db, p, 'admin')), { meta });
  });

  router.get('/products/manage/:id', ({ db, params }) => {
    requireAdmin(db);
    assertId(params.id);
    const product = db.get('products', params.id);
    if (!product) throw ApiError.notFound('Product not found');
    return ok(product);
  });

  router.post('/products', (ctx) => {
    requireAdmin(ctx.db);
    const data = validate(productSchema, ctx.body);
    assertProductRefs(data);
    const slug = data.slug ? toSlug(data.slug) : toSlug(data.title);
    return ctx.write((tx) => {
      if (!slug) throw ApiError.badRequest('Validation failed', { slug: 'Path `slug` is required.' });
      assertUnique(tx, 'products', 'slug', slug);
      const fields = priceByCheapestVariant({ ...data, slug, flashSaleEndsAt: toDate(data.flashSaleEndsAt) });
      const product = create('products', fields);
      recomputeStockStatus(product);
      // The stored copy has the id and timestamps; the reply and the opening stock entries must come from it.
      const stored = tx.insert('products', product);
      initialStockLogs(tx, stored, stored.productType === 'variable' ? stored.variants : []);
      markProgress(tx, 'product');
      return ok(stored, { status: 201, message: 'Product created' });
    });
  });

  /**
   * Editing a product never changes how much of it is in stock: stock moves through orders and the Inventory page's
   * adjustments, each of which leaves an audit-trail entry. A variant that is new to the product starts with the stock it
   * was given.
   */
  router.patch('/products/:id/stock', (ctx) => {
    const admin = requireAdmin(ctx.db);
    const { quantityChange, variantSku = null, note } = validate(stockAdjustSchema, ctx.body);
    assertId(ctx.params.id);
    return ctx.write((tx) => {
      const product = tx.get('products', ctx.params.id);
      if (!product) throw ApiError.notFound('Product not found');

      let current: number;
      if (variantSku) {
        const variant = product.variants.find((v: Doc) => v.sku === variantSku);
        if (!variant) throw ApiError.badRequest('That variant does not exist');
        current = variant.stock;
      } else if (product.productType === 'variable') {
        throw ApiError.badRequest('Choose which variant to adjust');
      } else {
        current = product.stock;
      }

      let result: { product: Doc; resultingStock: number } | null;
      if (quantityChange >= 0) {
        result = putBackStock(tx, { productId: product._id, variantSku, quantity: quantityChange });
      } else {
        const amount = Math.min(-quantityChange, current); // can't go below zero
        result =
          amount > 0
            ? takeStock(tx, { productId: product._id, variantSku, quantity: amount, requireActive: false })
            : { product, resultingStock: current };
      }
      if (!result) throw ApiError.conflict('Stock changed while you were adjusting it — please try again');

      tx.insert('inventorylogs', create('inventorylogs', {
        product: product._id,
        variantSku,
        changeType: quantityChange >= 0 ? 'restock' : 'adjustment',
        quantityChange: result.resultingStock - current,
        resultingStock: result.resultingStock,
        note,
        changedBy: admin._id,
      }));
      return ok(result.product, { message: 'Stock updated' });
    });
  });

  router.patch('/products/:id', (ctx) => {
    requireAdmin(ctx.db);
    const data = validate(productSchema.partial(), ctx.body);
    assertId(ctx.params.id);
    assertProductRefs(data);
    return ctx.write((tx) => {
      const existing = tx.get('products', ctx.params.id);
      if (!existing) throw ApiError.notFound('Product not found');

      // Whether it's variable is judged on what the product will be after this update, not just what was sent.
      const payload: Record<string, unknown> = priceByCheapestVariant({ productType: existing.productType, ...data });
      if (data.productType === undefined) delete payload.productType;
      if (payload.slug) payload.slug = toSlug(payload.slug);
      if ('flashSaleEndsAt' in payload) payload.flashSaleEndsAt = toDate(payload.flashSaleEndsAt);
      delete payload.stock;

      const currentStockBySku = new Map<string, number>(existing.variants.map((v: Doc) => [v.sku, v.stock]));
      let newVariants: Doc[] = [];
      if (Array.isArray(payload.variants)) {
        newVariants = (payload.variants as Doc[]).filter((v) => !currentStockBySku.has(v.sku));
        payload.variants = (payload.variants as Doc[]).map((v) =>
          currentStockBySku.has(v.sku) ? { ...v, stock: currentStockBySku.get(v.sku) } : v
        );
      }
      if (payload.slug) assertUnique(tx, 'products', 'slug', payload.slug, existing._id);

      const product = tx.edit('products', existing._id) as Doc;
      for (const [key, value] of Object.entries(payload)) product[key] = structuredClone(value);
      Object.assign(product, create('products', product));
      for (const key of Object.keys(product)) if (product[key] === undefined) delete product[key];
      recomputeStockStatus(product);

      const added = new Set(newVariants.map((v) => v.sku));
      initialStockLogs(tx, { _id: product._id, productType: 'variable', stock: 0 }, product.variants.filter((v: Doc) => added.has(v.sku)));
      return ok(product, { message: 'Product updated' });
    });
  });

  router.delete('/products/:id', (ctx) => {
    requireAdmin(ctx.db);
    assertId(ctx.params.id);
    return ctx.write((tx) => {
      if (!tx.remove('products', ctx.params.id)) throw ApiError.notFound('Product not found');
      return ok(null, { message: 'Product deleted' });
    });
  });

  router.get('/products', ({ db, query }) => {
    const { ids, category, brand, q, minPrice, maxPrice, rating, inStock, sort, page = 1, limit = 20 } = validate(productQuerySchema, query);
    const idSet = ids ? new Set(ids.split(',')) : null;
    const categories = category ? categoryAndChildren(db, category) : null;
    // An unknown brand has no products (and doesn't match the products with no brand).
    const brandId = brand ? (db.find('brands', (b) => b.slug === brand)?._id ?? '') : null;
    const text = q ? parseTextQuery(q) : null;

    const products = db.filter(
      'products',
      (p) =>
        p.status === 'active' &&
        (!idSet || idSet.has(p._id)) &&
        (!categories || categories.has(p.category)) &&
        (brandId === null || (brandId !== '' && p.brand === brandId)) &&
        (!text || matchesText(p, TEXT_FIELDS, text)) &&
        (minPrice == null || p.basePrice >= minPrice) &&
        (maxPrice == null || p.basePrice <= maxPrice) &&
        (!rating || p.ratingsAverage >= rating) &&
        (!inStock || p.stockStatus !== 'out_of_stock')
    );
    const { items, meta } = paginate(sortDocs(products, STOREFRONT_SORT[sort as string] ?? STOREFRONT_SORT.newest), page, limit);
    return ok(items.map(storefront(db)), { meta });
  });

  router.get('/products/:slug', ({ db, params }) => {
    const product = db.find('products', (p) => p.slug === params.slug && p.status === 'active');
    if (!product) throw ApiError.notFound('Product not found');
    const related = sortDocs(
      db.filter('products', (p) => p._id !== product._id && p.category === product.category && p.status === 'active'),
      { purchaseCount: -1, createdAt: -1 }
    ).slice(0, 4);
    return ok({ ...presentProduct(db, product, 'storefront'), related: related.map(storefront(db)) });
  });
}
