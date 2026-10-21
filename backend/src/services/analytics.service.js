import { AnalyticsEvent } from '../models/AnalyticsEvent.js';
import { Category } from '../models/Category.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { env } from '../config/env.js';
import { addDays, dayKey, recentDayKeys, startOfDay } from '../utils/timezone.js';

const TZ = env.storeTimezone;

/** A visitor re-loading the same product page isn't a new view — one per product per visitor per half hour. */
const VIEW_DEDUPE_MS = 30 * 60 * 1000;

/** Orders that count as sales. Cancelled and returned orders are not revenue. */
export const SALES_MATCH = { orderStatus: { $nin: ['cancelled', 'returned'] } };

const round2 = (n) => Math.round(n * 100) / 100;

// ---------- Recording events

/**
 * Records a storefront event for a product. `type` is 'view' or 'add_to_cart' (purchases are only
 * ever written by the server — see recordPurchase). Resolves { recorded, reason? }; never throws
 * for a missing product or a duplicate view, since the browser fires and forgets.
 */
export async function trackEvent({ type, productId, variantSku, quantity = 1, sessionId }) {
  const product = await Product.findOne({ _id: productId, status: 'active' }).select('basePrice variants.sku variants.price');
  if (!product) return { recorded: false, reason: 'not_found' };

  if (type === 'view') {
    const recentlySeen = await AnalyticsEvent.exists({
      type: 'view',
      product: product._id,
      sessionId,
      createdAt: { $gte: new Date(Date.now() - VIEW_DEDUPE_MS) },
    });
    if (recentlySeen) return { recorded: false, reason: 'duplicate' };
  }

  // The price comes from the catalogue, not the request, so the browser can't skew the figures.
  const variant = variantSku ? product.variants.find((v) => v.sku === variantSku) : null;
  const unitPrice = variant?.price ?? product.basePrice;
  const isView = type === 'view';

  await AnalyticsEvent.create({
    type,
    product: product._id,
    variantSku: variant ? variantSku : null,
    quantity: isView ? 1 : quantity,
    amount: isView ? 0 : unitPrice * quantity,
    sessionId,
    date: dayKey(new Date(), TZ),
  });

  // Lifetime counters on the product, kept in step with the events.
  Product.updateOne({ _id: product._id }, { $inc: isView ? { viewCount: 1 } : { addToCartCount: 1 } }).exec();

  return { recorded: true };
}

/** One 'purchase' event per line of a freshly placed order. Written by the server, never the browser. */
export async function recordPurchase(order, sessionId) {
  if (!order.items?.length) return;
  const date = dayKey(order.createdAt ?? new Date(), TZ);

  await AnalyticsEvent.insertMany(
    order.items.map((item) => ({
      type: 'purchase',
      product: item.product,
      variantSku: item.variantSku ?? null,
      quantity: item.quantity,
      amount: item.price * item.quantity,
      sessionId: sessionId ?? undefined,
      date,
    }))
  );
}

// ---------- Reporting

/**
 * The reporting window for "the last N days": today and the N-1 days before it, in the store's
 * timezone, plus the equally long period before that for "vs previous period" comparisons.
 */
function windowFor(days) {
  const keys = recentDayKeys(days, TZ);
  const from = keys[0];
  const to = keys[keys.length - 1];
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(from, -days);
  const prevKeys = Array.from({ length: days }, (_, i) => addDays(prevFrom, i));

  return {
    days,
    keys,
    prevKeys,
    from,
    to,
    prevFrom,
    prevTo,
    start: startOfDay(from, TZ),
    prevStart: startOfDay(prevFrom, TZ),
  };
}

function sumSeries(series) {
  const revenue = round2(series.reduce((sum, d) => sum + d.revenue, 0));
  const orders = series.reduce((sum, d) => sum + d.orders, 0);
  const units = series.reduce((sum, d) => sum + d.units, 0);
  return { revenue, orders, units, averageOrderValue: orders > 0 ? round2(revenue / orders) : 0 };
}

/** Revenue, orders and units per day, with totals for this period and the one before it. */
export async function getOverview({ days = 30 } = {}) {
  const w = windowFor(days);

  const rows = await Order.aggregate([
    { $match: { ...SALES_MATCH, createdAt: { $gte: w.prevStart } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } },
        revenue: { $sum: '$pricing.grandTotal' },
        orders: { $sum: 1 },
        units: { $sum: { $sum: '$items.quantity' } },
      },
    },
  ]);

  const byDay = new Map(rows.map((r) => [r._id, r]));
  const toPoint = (date) => {
    const row = byDay.get(date);
    return { date, revenue: round2(row?.revenue ?? 0), orders: row?.orders ?? 0, units: row?.units ?? 0 };
  };
  const series = w.keys.map(toPoint);
  const previousSeries = w.prevKeys.map(toPoint);

  return {
    days,
    timezone: TZ,
    from: w.from,
    to: w.to,
    previousFrom: w.prevFrom,
    previousTo: w.prevTo,
    totals: sumSeries(series),
    previous: sumSeries(previousSeries),
    series,
  };
}

/** Units and revenue per product across the window, from the orders themselves. */
async function soldByProduct(w) {
  return Order.aggregate([
    { $match: { ...SALES_MATCH, createdAt: { $gte: w.start } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        // The order line's own snapshot, so a product that has since been deleted still has a name.
        title: { $first: '$items.title' },
        image: { $first: '$items.image' },
        units: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        orders: { $addToSet: '$_id' },
      },
    },
    { $project: { title: 1, image: 1, units: 1, revenue: 1, orders: { $size: '$orders' } } },
  ]).option({ allowDiskUse: true });
}

/** Best sellers by units, plus the active products that sold least (traffic with no sales first). */
export async function getProductPerformance({ days = 30, limit = 10 } = {}) {
  const w = windowFor(days);

  const [sold, eventRows, products] = await Promise.all([
    soldByProduct(w),
    AnalyticsEvent.aggregate([
      { $match: { date: { $gte: w.from, $lte: w.to }, type: { $in: ['view', 'add_to_cart'] } } },
      { $group: { _id: { product: '$product', type: '$type' }, count: { $sum: 1 } } },
    ]),
    Product.find({ status: 'active' }).select('title images stockStatus createdAt').lean(),
  ]);

  const soldById = new Map(sold.map((s) => [String(s._id), s]));
  const productById = new Map(products.map((p) => [String(p._id), p]));
  const traffic = new Map();
  for (const row of eventRows) {
    const key = String(row._id.product);
    const entry = traffic.get(key) ?? { views: 0, addToCarts: 0 };
    if (row._id.type === 'view') entry.views = row.count;
    else entry.addToCarts = row.count;
    traffic.set(key, entry);
  }

  const toRow = (id, sale, product) => ({
    id,
    title: product?.title ?? sale?.title ?? 'Deleted product',
    image: product?.images?.[0]?.url ?? sale?.image ?? null,
    units: sale?.units ?? 0,
    revenue: round2(sale?.revenue ?? 0),
    orders: sale?.orders ?? 0,
    views: traffic.get(id)?.views ?? 0,
    addToCarts: traffic.get(id)?.addToCarts ?? 0,
    stockStatus: product?.stockStatus ?? null,
  });

  const top = [...soldById.entries()]
    .map(([id, sale]) => toRow(id, sale, productById.get(id)))
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
    .slice(0, limit);

  // A product added this week hasn't had a fair chance to sell, so it isn't "worst".
  const newProductCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const worst = products
    .filter((p) => new Date(p.createdAt).getTime() < newProductCutoff)
    .map((p) => toRow(String(p._id), soldById.get(String(p._id)), p))
    .sort((a, b) => a.units - b.units || b.views - a.views || a.title.localeCompare(b.title))
    .slice(0, limit);

  return { days, from: w.from, to: w.to, top, worst };
}

/** Product sales rolled up to top-level categories. */
export async function getCategoryBreakdown({ days = 30 } = {}) {
  const w = windowFor(days);

  const [sold, categories] = await Promise.all([soldByProduct(w), Category.find().select('name slug parent').lean()]);
  const products = await Product.find({ _id: { $in: sold.map((s) => s._id) } }).select('category').lean();

  const categoryById = new Map(categories.map((c) => [String(c._id), c]));
  const categoryOfProduct = new Map(products.map((p) => [String(p._id), String(p.category)]));

  const topLevelOf = (categoryId) => {
    let current = categoryById.get(categoryId);
    for (let depth = 0; current?.parent && depth < 10; depth++) {
      current = categoryById.get(String(current.parent));
    }
    return current ?? null;
  };

  const rollup = new Map();
  for (const sale of sold) {
    const categoryId = categoryOfProduct.get(String(sale._id));
    const top = categoryId ? topLevelOf(categoryId) : null;
    const key = top ? String(top._id) : 'uncategorised';
    const entry = rollup.get(key) ?? {
      id: top ? key : null,
      name: top?.name ?? 'Uncategorised',
      slug: top?.slug ?? null,
      units: 0,
      revenue: 0,
    };
    entry.units += sale.units;
    entry.revenue += sale.revenue;
    rollup.set(key, entry);
  }

  const total = [...rollup.values()].reduce((sum, c) => sum + c.revenue, 0);
  const rows = [...rollup.values()]
    .map((c) => ({ ...c, revenue: round2(c.revenue), share: total > 0 ? c.revenue / total : 0 }))
    .sort((a, b) => b.revenue - a.revenue);

  return { days, from: w.from, to: w.to, total: round2(total), categories: rows };
}

/**
 * Visitors (anonymous browsers) moving from looking at products, to adding one to the cart, to
 * placing an order. Each step is a subset of the one before: an add-to-cart or a purchase implies
 * the visitor was browsing, so a quick-add from a product card still counts as having browsed.
 */
export async function getFunnel({ days = 30 } = {}) {
  const w = windowFor(days);
  const inRange = { date: { $gte: w.from, $lte: w.to } };

  const [visitorRows, eventRows] = await Promise.all([
    AnalyticsEvent.aggregate([
      { $match: { ...inRange, sessionId: { $nin: [null, ''] } } },
      { $group: { _id: '$sessionId', types: { $addToSet: '$type' } } },
      {
        $group: {
          _id: null,
          browsed: { $sum: 1 },
          carted: {
            $sum: { $cond: [{ $or: [{ $in: ['add_to_cart', '$types'] }, { $in: ['purchase', '$types'] }] }, 1, 0] },
          },
          purchased: { $sum: { $cond: [{ $in: ['purchase', '$types'] }, 1, 0] } },
        },
      },
      // One group per visitor can be large on a busy store; let it spill to disk rather than fail.
    ]).option({ allowDiskUse: true }),
    AnalyticsEvent.aggregate([{ $match: inRange }, { $group: { _id: '$type', count: { $sum: 1 } } }]),
  ]);

  const visitors = visitorRows[0] ?? { browsed: 0, carted: 0, purchased: 0 };
  const events = Object.fromEntries(eventRows.map((r) => [r._id, r.count]));

  return {
    days,
    from: w.from,
    to: w.to,
    steps: [
      { key: 'browsed', label: 'Browsed products', visitors: visitors.browsed },
      { key: 'carted', label: 'Added to cart', visitors: visitors.carted },
      { key: 'purchased', label: 'Placed an order', visitors: visitors.purchased },
    ],
    conversionRate: visitors.browsed > 0 ? visitors.purchased / visitors.browsed : null,
    events: { views: events.view ?? 0, addToCarts: events.add_to_cart ?? 0, purchases: events.purchase ?? 0 },
  };
}
