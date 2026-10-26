import { trackEventSchema, rangeQuerySchema, productsQuerySchema } from '../backend/validators/analytics.validators.js';
import { requireAdmin } from '../auth';
import type { Database } from '../db';
import { ApiError } from '../errors';
import { ok, type Router } from '../http';
import { STORE_TIMEZONE, addDays, dayKey, recentDayKeys, startOfDay } from '../lib/timezone';
import type { Doc } from '../types';
import { round2 } from '../util';
import { validate } from '../validate';

/** Analytics — analytics.service.js, over the local orders and events. */

/** A visitor re-loading the same product page isn't a new view — one per product per visitor per half hour. */
const VIEW_DEDUPE_MS = 30 * 60 * 1000;

/** Orders that count as sales. Cancelled and returned orders are not revenue. */
const isSale = (order: Doc) => order.orderStatus !== 'cancelled' && order.orderStatus !== 'returned';

/** "The last N days": today and the N-1 days before it, plus the equally long period before that, for comparisons. */
function windowFor(days: number) {
  const keys = recentDayKeys(days);
  const from = keys[0];
  const to = keys[keys.length - 1];
  const prevFrom = addDays(from, -days);
  return {
    days,
    keys,
    prevKeys: Array.from({ length: days }, (_, i) => addDays(prevFrom, i)),
    from,
    to,
    prevFrom,
    prevTo: addDays(from, -1),
    start: startOfDay(from).toISOString(),
    prevStart: startOfDay(prevFrom).toISOString(),
  };
}
type Window = ReturnType<typeof windowFor>;

interface Point {
  date: string;
  revenue: number;
  orders: number;
  units: number;
}

function sumSeries(series: Point[]) {
  const revenue = round2(series.reduce((sum, d) => sum + d.revenue, 0));
  const orders = series.reduce((sum, d) => sum + d.orders, 0);
  const units = series.reduce((sum, d) => sum + d.units, 0);
  return { revenue, orders, units, averageOrderValue: orders > 0 ? round2(revenue / orders) : 0 };
}

/** Revenue, orders and units per day, with totals for this period and the one before it. */
export function getOverview(db: Database, days = 30) {
  const w = windowFor(days);
  const byDay = new Map<string, Point>();
  for (const order of db.all('orders')) {
    if (!isSale(order) || order.createdAt < w.prevStart) continue;
    const date = dayKey(order.createdAt);
    const row = byDay.get(date) ?? { date, revenue: 0, orders: 0, units: 0 };
    row.revenue += order.pricing.grandTotal;
    row.orders += 1;
    row.units += order.items.reduce((sum: number, i: Doc) => sum + i.quantity, 0);
    byDay.set(date, row);
  }
  const toPoint = (date: string): Point => {
    const row = byDay.get(date);
    return { date, revenue: round2(row?.revenue ?? 0), orders: row?.orders ?? 0, units: row?.units ?? 0 };
  };
  const series = w.keys.map(toPoint);
  return {
    days,
    timezone: STORE_TIMEZONE,
    from: w.from,
    to: w.to,
    previousFrom: w.prevFrom,
    previousTo: w.prevTo,
    totals: sumSeries(series),
    previous: sumSeries(w.prevKeys.map(toPoint)),
    series,
  };
}

interface Sold {
  id: string;
  title: string;
  image: string | null;
  units: number;
  revenue: number;
  orders: number;
}

/** Units and revenue per product across the window, from the orders themselves (their own copy of title and picture). */
function soldByProduct(db: Database, w: Window): Map<string, Sold> {
  const sold = new Map<string, Sold & { orderIds: Set<string> }>();
  for (const order of db.all('orders')) {
    if (!isSale(order) || order.createdAt < w.start) continue;
    for (const item of order.items) {
      const entry = sold.get(item.product) ?? { id: item.product, title: item.title, image: item.image ?? null, units: 0, revenue: 0, orders: 0, orderIds: new Set() };
      entry.units += item.quantity;
      entry.revenue += item.price * item.quantity;
      entry.orderIds.add(order._id);
      entry.orders = entry.orderIds.size;
      sold.set(item.product, entry);
    }
  }
  return sold;
}

/** Best sellers by units, plus the active products that sold least (traffic with no sales first). */
function getProductPerformance(db: Database, days = 30, limit = 10) {
  const w = windowFor(days);
  const soldById = soldByProduct(db, w);
  const traffic = new Map<string, { views: number; addToCarts: number }>();
  for (const event of db.events) {
    if (event.date < w.from || event.date > w.to || event.type === 'purchase') continue;
    const entry = traffic.get(event.product) ?? { views: 0, addToCarts: 0 };
    if (event.type === 'view') entry.views += 1;
    else entry.addToCarts += 1;
    traffic.set(event.product, entry);
  }
  const products = db.filter('products', (p) => p.status === 'active');
  const productById = new Map(products.map((p) => [p._id, p]));

  const toRow = (id: string, sale: Sold | undefined, product: Doc | undefined) => ({
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
    .filter((p) => Date.parse(p.createdAt) < newProductCutoff)
    .map((p) => toRow(p._id, soldById.get(p._id), p))
    .sort((a, b) => a.units - b.units || b.views - a.views || a.title.localeCompare(b.title))
    .slice(0, limit);

  return { days, from: w.from, to: w.to, top, worst };
}

/** Product sales rolled up to top-level categories. */
function getCategoryBreakdown(db: Database, days = 30) {
  const w = windowFor(days);
  const sold = soldByProduct(db, w);
  const categoryById = new Map(db.all('categories').map((c) => [c._id, c]));
  const topLevelOf = (categoryId: string) => {
    let current = categoryById.get(categoryId);
    for (let depth = 0; current?.parent && depth < 10; depth++) current = categoryById.get(current.parent);
    return current ?? null;
  };

  const rollup = new Map<string, { id: string | null; name: string; slug: string | null; units: number; revenue: number }>();
  for (const sale of sold.values()) {
    const categoryId = db.get('products', sale.id)?.category;
    const top = categoryId ? topLevelOf(categoryId) : null;
    const key = top ? top._id : 'uncategorised';
    const entry = rollup.get(key) ?? { id: top ? key : null, name: top?.name ?? 'Uncategorised', slug: top?.slug ?? null, units: 0, revenue: 0 };
    entry.units += sale.units;
    entry.revenue += sale.revenue;
    rollup.set(key, entry);
  }

  const total = [...rollup.values()].reduce((sum, c) => sum + c.revenue, 0);
  const categories = [...rollup.values()]
    .map((c) => ({ ...c, revenue: round2(c.revenue), share: total > 0 ? c.revenue / total : 0 }))
    .sort((a, b) => b.revenue - a.revenue);
  return { days, from: w.from, to: w.to, total: round2(total), categories };
}

/** Visitors moving from browsing, to adding to the cart, to ordering — each step a subset of the one before. */
function getFunnel(db: Database, days = 30) {
  const w = windowFor(days);
  const inRange = db.events.filter((e) => e.date >= w.from && e.date <= w.to);
  const typesBySession = new Map<string, Set<string>>();
  for (const event of inRange) {
    if (!event.sessionId) continue;
    const types = typesBySession.get(event.sessionId) ?? new Set();
    types.add(event.type);
    typesBySession.set(event.sessionId, types);
  }
  let carted = 0;
  let purchased = 0;
  for (const types of typesBySession.values()) {
    if (types.has('add_to_cart') || types.has('purchase')) carted += 1;
    if (types.has('purchase')) purchased += 1;
  }
  const browsed = typesBySession.size;
  const count = (type: string) => inRange.filter((e) => e.type === type).length;

  return {
    days,
    from: w.from,
    to: w.to,
    steps: [
      { key: 'browsed', label: 'Browsed products', visitors: browsed },
      { key: 'carted', label: 'Added to cart', visitors: carted },
      { key: 'purchased', label: 'Placed an order', visitors: purchased },
    ],
    conversionRate: browsed > 0 ? purchased / browsed : null,
    events: { views: count('view'), addToCarts: count('add_to_cart'), purchases: count('purchase') },
  };
}

export function analyticsRoutes(router: Router) {
  /** The storefront reports a product view or an add-to-cart. The price comes from the catalogue, not the request. */
  router.post('/analytics/track', (ctx) => {
    const { type, product: productId, variantSku, quantity = 1 } = validate(trackEventSchema, ctx.body);
    const product = ctx.db.find('products', (p) => p._id === productId && p.status === 'active');
    if (!product) throw ApiError.notFound('Product not found');

    if (type === 'view') {
      const since = new Date(Date.now() - VIEW_DEDUPE_MS).toISOString();
      const recentlySeen = ctx.db.events.some(
        (e) => e.type === 'view' && e.product === product._id && e.sessionId === ctx.visitorId && e.createdAt >= since
      );
      if (recentlySeen) return ok({ recorded: false }, { status: 202, message: 'Accepted' });
    }

    const variant = variantSku ? product.variants.find((v: Doc) => v.sku === variantSku) : null;
    const unitPrice = variant?.price ?? product.basePrice;
    const isView = type === 'view';
    return ctx.write((tx) => {
      const now = tx.now;
      tx.addEvents([
        {
          type,
          product: product._id,
          variantSku: variant ? variant.sku : null,
          quantity: isView ? 1 : quantity,
          amount: isView ? 0 : unitPrice * quantity,
          sessionId: ctx.visitorId,
          date: dayKey(now),
          createdAt: now,
        },
      ]);
      // Lifetime counters on the product, kept in step with the events.
      const counted = tx.edit('products', product._id) as Doc;
      if (isView) counted.viewCount += 1;
      else counted.addToCartCount += 1;
      return ok({ recorded: true }, { status: 202, message: 'Accepted' });
    });
  });

  router.get('/analytics/overview', ({ db, query }) => {
    requireAdmin(db);
    const { days } = validate(rangeQuerySchema, query);
    return ok(getOverview(db, days));
  });

  router.get('/analytics/products', ({ db, query }) => {
    requireAdmin(db);
    const { days, limit } = validate(productsQuerySchema, query);
    return ok(getProductPerformance(db, days, limit));
  });

  router.get('/analytics/categories', ({ db, query }) => {
    requireAdmin(db);
    const { days } = validate(rangeQuerySchema, query);
    return ok(getCategoryBreakdown(db, days));
  });

  router.get('/analytics/funnel', ({ db, query }) => {
    requireAdmin(db);
    const { days } = validate(rangeQuerySchema, query);
    return ok(getFunnel(db, days));
  });
}
