import { couponSchema, couponUpdateSchema, couponQuerySchema } from '../backend/validators/coupon.validators.js';
import { customerQuerySchema } from '../backend/validators/customer.validators.js';
import { inventoryQuerySchema } from '../backend/validators/inventory.validators.js';
import { requireAdmin } from '../auth';
import { ApiError } from '../errors';
import { ok, type Router } from '../http';
import { startOfDay } from '../lib/timezone';
import { ref } from '../populate';
import { assertId, assertUnique, create } from '../schemas';
import type { Doc } from '../types';
import { containsText, omit, paginate, pick, sortDocs } from '../util';
import { validate } from '../validate';
import { getOverview } from './analytics';
import { applyUpdate } from './catalog';
import { rememberCoupon } from './progress';

/** Dashboard, notifications, inventory, customers and coupons — the admin's own controllers. */

const pctChange = (curr: number, prev: number) => (prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100));
const LOW = new Set(['low_stock', 'out_of_stock']);

/** A Mongoose cast of a date the coupon form sends ("2026-11-30"), or null for "no date". */
function couponDates<T extends { startsAt?: string | null; expiresAt?: string | null }>(body: T): T {
  const out = { ...body };
  for (const key of ['startsAt', 'expiresAt'] as const) {
    const value = out[key];
    if (typeof value !== 'string') continue;
    const time = Date.parse(value);
    if (Number.isNaN(time)) throw ApiError.badRequest('Validation failed', { [key]: `Cast to date failed for value "${value}"` });
    out[key] = new Date(time).toISOString();
  }
  return out;
}

export function adminRoutes(router: Router) {
  // ---------- Dashboard

  router.get('/dashboard', ({ db }) => {
    requireAdmin(db);
    // The same calculation the Analytics page uses, so the two always agree for the same period.
    const overview = getOverview(db, 30);
    const since30 = startOfDay(overview.from).toISOString();
    const topProducts = sortDocs(db.filter('products', (p) => p.purchaseCount > 0), { purchaseCount: -1 })
      .slice(0, 5)
      .map((p) => pick(p, ['title', 'images', 'purchaseCount', 'revenueTotal']));
    return ok({
      revenue30d: overview.totals.revenue,
      orders30d: overview.totals.orders,
      highRiskOrders30d: db.filter('orders', (o) => o.createdAt >= since30 && o.fraudRisk?.level === 'high').length,
      lowStockProducts: db.filter('products', (p) => LOW.has(p.stockStatus)).length,
      revenueTrendPct: pctChange(overview.totals.revenue, overview.previous.revenue),
      ordersTrendPct: pctChange(overview.totals.orders, overview.previous.orders),
      revenueSeries: overview.series.slice(-14).map(({ date, revenue, orders }) => ({ date, revenue, orders })),
      topProducts,
    });
  });

  router.get('/dashboard/notifications', ({ db }) => {
    requireAdmin(db);
    const lowStock = sortDocs(db.filter('products', (p) => LOW.has(p.stockStatus)), { updatedAt: -1 }).slice(0, 5);
    const riskyOrders = sortDocs(
      db.filter('orders', (o) => o.fraudRisk?.level === 'high' && !['cancelled', 'delivered'].includes(o.orderStatus)),
      { createdAt: -1 }
    ).slice(0, 5);
    const pendingOrders = sortDocs(db.filter('orders', (o) => o.orderStatus === 'pending'), { createdAt: -1 }).slice(0, 5);

    const items = [
      ...lowStock.map((p) => ({
        id: `low-stock-${p._id}`,
        type: 'low_stock',
        message: `${p.title} is ${p.stockStatus === 'out_of_stock' ? 'out of stock' : 'low on stock'}`,
        link: '/inventory',
        createdAt: p.updatedAt,
      })),
      ...riskyOrders.map((o) => ({
        id: `fraud-${o._id}`,
        type: 'fraud_risk',
        message: `Order ${o.orderNumber} flagged as high fraud risk`,
        link: '/orders',
        createdAt: o.createdAt,
      })),
      ...pendingOrders.map((o) => ({
        id: `order-${o._id}`,
        type: 'new_order',
        message: `New order ${o.orderNumber} — ৳${o.pricing.grandTotal.toLocaleString('en-US')}`,
        link: '/orders',
        createdAt: o.createdAt,
      })),
    ]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 10);
    return ok(items);
  });

  // ---------- Inventory

  router.get('/inventory/low-stock', ({ db }) => {
    requireAdmin(db);
    const fields = ['title', 'slug', 'images', 'stock', 'stockStatus', 'lowStockThreshold', 'productType', 'variants'];
    return ok(sortDocs(db.filter('products', (p) => LOW.has(p.stockStatus)), { stock: 1 }).map((p) => pick(p, fields)));
  });

  router.get('/inventory', ({ db, query }) => {
    requireAdmin(db);
    const { product, page = 1, limit = 20 } = validate(inventoryQuerySchema, query);
    const logs = sortDocs(db.filter('inventorylogs', (l) => !product || l.product === product), { createdAt: -1 });
    const { items, meta } = paginate(logs, page, limit);
    return ok(
      items.map((l) => ({
        ...l,
        product: ref(db, 'products', l.product, ['title', 'slug']),
        changedBy: l.changedBy ? ref(db, 'admins', l.changedBy, ['name']) : null,
      })),
      { meta }
    );
  });

  // ---------- Customers

  router.get('/customers', ({ db, query }) => {
    requireAdmin(db);
    const { q, page = 1, limit = 20 } = validate(customerQuerySchema, query);
    const users = sortDocs(
      db.filter('users', (u) => !q || containsText(u.name, q) || containsText(u.phone, q) || containsText(u.email, q)),
      { createdAt: -1 }
    );
    const { items, meta } = paginate(users, page, limit);
    return ok(items.map((u) => omit(u, ['passwordHash'])), { meta });
  });

  router.get('/customers/:id', ({ db, params }) => {
    requireAdmin(db);
    assertId(params.id);
    const user = db.get('users', params.id);
    if (!user) throw ApiError.notFound('Customer not found');
    const orders = sortDocs(db.filter('orders', (o) => o.customer === user._id), { createdAt: -1 }).map((o) =>
      pick(o, ['orderNumber', 'orderStatus', 'paymentStatus', 'pricing.grandTotal', 'createdAt'])
    );
    return ok({ ...omit(user, ['passwordHash']), orders });
  });

  // ---------- Coupons

  router.get('/coupons', ({ db, query }) => {
    requireAdmin(db);
    const { status, q, page = 1, limit = 20 } = validate(couponQuerySchema, query);
    const coupons = sortDocs(db.filter('coupons', (c) => (!status || c.status === status) && (!q || containsText(c.code, q))), { createdAt: -1 });
    const { items, meta } = paginate(coupons, page, limit);
    return ok(items, { meta });
  });

  router.post('/coupons', (ctx) => {
    requireAdmin(ctx.db);
    const body = couponDates(validate(couponSchema, ctx.body));
    return ctx.write((tx) => {
      const fields = create('coupons', body);
      assertUnique(tx, 'coupons', 'code', fields.code);
      const coupon = tx.insert('coupons', fields);
      rememberCoupon(tx, coupon.code);
      return ok(coupon, { status: 201, message: 'Coupon created' });
    });
  });

  router.patch('/coupons/:id', (ctx) => {
    requireAdmin(ctx.db);
    const payload = couponDates(validate(couponUpdateSchema, ctx.body));
    assertId(ctx.params.id);
    return ctx.write((tx) => {
      const coupon = tx.edit('coupons', ctx.params.id);
      if (!coupon) throw ApiError.notFound('Coupon not found');
      applyUpdate(coupon, payload, (d) => create('coupons', d) as Doc);
      assertUnique(tx, 'coupons', 'code', coupon.code, coupon._id);
      if (payload.code) rememberCoupon(tx, coupon.code);
      return ok(coupon, { message: 'Coupon updated' });
    });
  });

  router.delete('/coupons/:id', (ctx) => {
    requireAdmin(ctx.db);
    assertId(ctx.params.id);
    return ctx.write((tx) => {
      if (!tx.remove('coupons', ctx.params.id)) throw ApiError.notFound('Coupon not found');
      return ok(null, { message: 'Coupon deleted' });
    });
  });
}
