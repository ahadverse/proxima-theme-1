import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { env } from '../config/env.js';
import { startOfDay } from '../utils/timezone.js';
import { getOverview } from '../services/analytics.service.js';

function pctChange(curr, prev) {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

export const summary = asyncHandler(async (req, res) => {
  // Revenue, orders and the daily series come from the same calculation the Analytics page uses
  // (calendar days in the store's timezone, cancelled/returned orders excluded), so the two pages
  // always agree for the same period.
  const overview = await getOverview({ days: 30 });
  const since30 = startOfDay(overview.from, env.storeTimezone);

  const [highRiskOrders30d, lowStockProducts, topProducts] = await Promise.all([
    Order.countDocuments({ createdAt: { $gte: since30 }, 'fraudRisk.level': 'high' }),
    Product.countDocuments({ stockStatus: { $in: ['low_stock', 'out_of_stock'] } }),
    Product.find({ purchaseCount: { $gt: 0 } })
      .sort({ purchaseCount: -1 })
      .limit(5)
      .select('title images purchaseCount revenueTotal'),
  ]);

  sendSuccess(res, {
    data: {
      revenue30d: overview.totals.revenue,
      orders30d: overview.totals.orders,
      highRiskOrders30d,
      lowStockProducts,
      revenueTrendPct: pctChange(overview.totals.revenue, overview.previous.revenue),
      ordersTrendPct: pctChange(overview.totals.orders, overview.previous.orders),
      revenueSeries: overview.series.slice(-14).map(({ date, revenue, orders }) => ({ date, revenue, orders })),
      topProducts,
    },
  });
});

export const notifications = asyncHandler(async (req, res) => {
  const [lowStock, riskyOrders, pendingOrders] = await Promise.all([
    Product.find({ stockStatus: { $in: ['low_stock', 'out_of_stock'] } })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('title stockStatus updatedAt'),
    Order.find({ 'fraudRisk.level': 'high', orderStatus: { $nin: ['cancelled', 'delivered'] } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('orderNumber createdAt'),
    Order.find({ orderStatus: 'pending' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('orderNumber createdAt pricing.grandTotal'),
  ]);

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
      message: `New order ${o.orderNumber} — ৳${o.pricing.grandTotal.toLocaleString()}`,
      link: '/orders',
      createdAt: o.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  sendSuccess(res, { data: items });
});
