import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Brand } from '../models/Brand.js';
import { InventoryLog } from '../models/InventoryLog.js';
import { ApiError } from '../utils/ApiError.js';
import { toSlug } from '../utils/slugify.js';
import * as stockService from './stock.service.js';
import { productImageUrls, removeUnusedImages } from './imageCleanup.service.js';

// Sales, revenue and traffic counters belong to the admin dashboard. They are never part of what the
// storefront (or anyone calling the public API) receives.
const PUBLIC_SELECT = '-viewCount -addToCartCount -purchaseCount -revenueTotal';

const PUBLIC_POPULATE = [
  { path: 'category', select: 'name slug' },
  { path: 'brand', select: 'name slug logo' },
  { path: 'attributesUsed', select: 'name slug type' },
  { path: 'variants.attributes.attribute', select: 'name slug type' },
];

// What the storefront's product reads fill in. The shop never shows a product's `attributesUsed` (only the admin's product
// form does, through the admin endpoints), and every populated path is one more database round trip on every page view.
const STOREFRONT_POPULATE = PUBLIC_POPULATE.filter((p) => p.path !== 'attributesUsed');

async function resolveCategoryAndDescendants(categorySlug) {
  const category = await Category.findOne({ slug: categorySlug });
  if (!category) return [];
  const children = await Category.find({ parent: category._id }).select('_id');
  return [category._id, ...children.map((c) => c._id)];
}

export async function listProducts(query) {
  const { ids, category, brand, q, minPrice, maxPrice, rating, inStock, sort, page = 1, limit = 20 } = query;

  const filter = { status: 'active' };

  if (ids) filter._id = { $in: ids.split(',') };

  if (category) {
    const ids = await resolveCategoryAndDescendants(category);
    filter.category = { $in: ids };
  }
  if (brand) {
    const brandDoc = await Brand.findOne({ slug: brand });
    // An unknown brand has no products. `brand: null` would instead match every product with no brand.
    filter.brand = brandDoc ? brandDoc._id : { $in: [] };
  }
  if (q) filter.$text = { $search: q };
  if (minPrice != null || maxPrice != null) {
    filter.basePrice = {};
    if (minPrice != null) filter.basePrice.$gte = minPrice;
    if (maxPrice != null) filter.basePrice.$lte = maxPrice;
  }
  if (rating) filter.ratingsAverage = { $gte: rating };
  if (inStock) filter.stockStatus = { $ne: 'out_of_stock' };

  const sortMap = {
    newest: { createdAt: -1 },
    price_asc: { basePrice: 1 },
    price_desc: { basePrice: -1 },
    rating: { ratingsAverage: -1 },
    trending: { purchaseCount: -1 },
  };
  const sortBy = sortMap[sort] || sortMap.newest;

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Product.find(filter).sort(sortBy).skip(skip).limit(limit).select(PUBLIC_SELECT).populate(STOREFRONT_POPULATE),
    Product.countDocuments(filter),
  ]);

  return { items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

/** Admin product list — unlike listProducts(), not restricted to status:'active', and filters by
 * category/brand id directly (the admin UI picks these from a dropdown of actual documents). */
export async function listProductsAdmin(query) {
  const { category, brand, q, status, sort, page = 1, limit = 20 } = query;

  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (brand) filter.brand = brand;
  if (q) filter.$text = { $search: q };

  const sortMap = {
    newest: { createdAt: -1 },
    price_asc: { basePrice: 1 },
    price_desc: { basePrice: -1 },
  };
  const sortBy = sortMap[sort] || sortMap.newest;

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Product.find(filter).sort(sortBy).skip(skip).limit(limit).populate(PUBLIC_POPULATE),
    Product.countDocuments(filter),
  ]);

  return { items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

const FEATURED_FLAGS = {
  'flash-sale': { isFlashSale: true },
  trending: { isTrending: true },
  'new-arrivals': { isNewArrival: true },
  'best-sellers': { isBestSeller: true },
};

/** How much of the compare-at price a product saves, 0–1. */
function discountRatio(product) {
  const { basePrice, compareAtPrice } = product;
  return compareAtPrice > basePrice ? (compareAtPrice - basePrice) / compareAtPrice : 0;
}

/**
 * A curated shelf of the storefront (flash sale, trending, …). `sort` is what the tabs above a shelf
 * pick between: newest first (default), most bought, or biggest markdown.
 */
export async function getFeaturedList(type, { limit = 10, sort = 'newest' } = {}) {
  const filter = { status: 'active', ...(FEATURED_FLAGS[type] || {}) };
  // A flash sale that has run out its clock is no longer on the shelf (one with no end date runs until switched off).
  if (type === 'flash-sale') {
    filter.$or = [{ flashSaleEndsAt: null }, { flashSaleEndsAt: { $gt: new Date() } }];
  }
  const find = (order, count) =>
    Product.find(filter).sort(order).limit(count).select(PUBLIC_SELECT).populate(STOREFRONT_POPULATE);

  if (sort === 'value') {
    // Ranked in memory: a shelf is a curated handful of products, and the ratio isn't a stored field.
    const items = await find({ createdAt: -1 }, 200);
    return items.sort((a, b) => discountRatio(b) - discountRatio(a)).slice(0, limit);
  }
  return find(sort === 'popular' ? { purchaseCount: -1, ratingsCount: -1, createdAt: -1 } : { createdAt: -1 }, limit);
}

export async function getProductBySlug(slug) {
  const product = await Product.findOne({ slug, status: 'active' }).select(PUBLIC_SELECT).populate(STOREFRONT_POPULATE);
  if (!product) throw ApiError.notFound('Product not found');

  // Views are counted when the browser reports them (POST /analytics/track), not here: this is
  // called by the storefront's server for every (cached) render, which isn't a visitor.
  return product;
}

export async function getRelatedProducts(product, limit = 4) {
  return Product.find({
    _id: { $ne: product._id },
    category: product.category,
    status: 'active',
  })
    .sort({ purchaseCount: -1, createdAt: -1 })
    .limit(limit)
    .select(PUBLIC_SELECT)
    .populate(STOREFRONT_POPULATE);
}

/**
 * A variable product is listed at its cheapest variant — the price a shopper sees on a card has to be
 * one they can actually buy it at. Whatever base price came with the form is replaced by that.
 */
function priceByCheapestVariant(data) {
  if (data.productType !== 'variable' || !Array.isArray(data.variants) || data.variants.length === 0) return data;
  const cheapest = data.variants.reduce((a, b) => (b.price < a.price ? b : a));
  return { ...data, basePrice: cheapest.price, compareAtPrice: cheapest.compareAtPrice };
}

/** Writes an audit-trail entry for stock that came into existence with the product or a new variant. */
function initialStockLogs(product, variants) {
  const entries = [];
  if (product.productType !== 'variable' && product.stock > 0) {
    entries.push({
      product: product._id,
      changeType: 'restock',
      quantityChange: product.stock,
      resultingStock: product.stock,
      note: 'Initial stock on product creation',
    });
  }
  for (const variant of variants) {
    if (variant.stock > 0) {
      entries.push({
        product: product._id,
        variantSku: variant.sku,
        changeType: 'restock',
        quantityChange: variant.stock,
        resultingStock: variant.stock,
        note: 'Initial stock on product creation',
      });
    }
  }
  return entries.length ? InventoryLog.insertMany(entries) : null;
}

export async function createProduct(data) {
  const slug = data.slug ? toSlug(data.slug) : toSlug(data.title);
  const product = await Product.create({ ...priceByCheapestVariant(data), slug });
  await initialStockLogs(product, product.productType === 'variable' ? product.variants : []);
  return product;
}

/**
 * Editing a product never changes how much of it is in stock. Stock moves through orders and the
 * Inventory page's adjustments, each of which is atomic and leaves an audit-trail entry — whereas a
 * product form saved minutes after it was opened would overwrite everything sold in between with the
 * number it loaded. A variant that is new to the product starts with the stock it was given.
 */
export async function updateProduct(id, data) {
  const existing = await Product.findById(id);
  if (!existing) throw ApiError.notFound('Product not found');

  // Whether it's variable is judged on what the product will be after this update, not just what was sent.
  const payload = priceByCheapestVariant({ productType: existing.productType, ...data });
  if (data.productType === undefined) delete payload.productType;
  if (payload.slug) payload.slug = toSlug(payload.slug);
  delete payload.stock;

  const currentStockBySku = new Map(existing.variants.map((v) => [v.sku, v.stock]));
  let newVariants = [];
  if (Array.isArray(payload.variants)) {
    newVariants = payload.variants.filter((v) => !currentStockBySku.has(v.sku));
    payload.variants = payload.variants.map((v) =>
      currentStockBySku.has(v.sku) ? { ...v, stock: currentStockBySku.get(v.sku) } : v
    );
  }

  const imagesBefore = productImageUrls(existing);
  Object.assign(existing, payload);
  await existing.save();
  await initialStockLogs({ _id: existing._id, productType: 'variable', stock: 0 }, newVariants);

  // A photo that was taken off the product is deleted from storage too (unless something else still uses it).
  const imagesAfter = new Set(productImageUrls(existing));
  void removeUnusedImages(imagesBefore.filter((url) => !imagesAfter.has(url)));

  return existing;
}

export async function deleteProduct(id) {
  const product = await Product.findByIdAndDelete(id);
  if (!product) throw ApiError.notFound('Product not found');
  // Its photos go with it — except any that an old order still shows (orders keep their own copy of the picture).
  void removeUnusedImages(productImageUrls(product));
}

/**
 * Changes stock by a signed amount — of a simple product, or of one variant of a variable one — and
 * records it. The change itself is atomic (see stock.service) and never takes stock below zero.
 */
export async function adjustStock(id, { quantityChange, variantSku = null, note, changedBy }) {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound('Product not found');

  let current;
  if (variantSku) {
    const variant = product.variants.find((v) => v.sku === variantSku);
    if (!variant) throw ApiError.badRequest('That variant does not exist');
    current = variant.stock;
  } else if (product.productType === 'variable') {
    throw ApiError.badRequest('Choose which variant to adjust');
  } else {
    current = product.stock;
  }

  let result;
  if (quantityChange >= 0) {
    result = await stockService.putBackStock({ productId: id, variantSku, quantity: quantityChange });
  } else {
    const amount = Math.min(-quantityChange, current); // can't go below zero
    result =
      amount > 0
        ? await stockService.takeStock({ productId: id, variantSku, quantity: amount, requireActive: false })
        : { product, resultingStock: current };
  }
  if (!result) throw ApiError.conflict('Stock changed while you were adjusting it — please try again');

  await InventoryLog.create({
    product: product._id,
    variantSku,
    changeType: quantityChange >= 0 ? 'restock' : 'adjustment',
    quantityChange: result.resultingStock - current,
    resultingStock: result.resultingStock,
    note,
    changedBy,
  });

  return result.product;
}
