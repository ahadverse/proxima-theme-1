import {
  createOrderSchema,
  updateOrderStatusSchema,
  updateOrderPaymentSchema,
  adminOrderQuerySchema,
  validateCouponSchema,
} from '../backend/validators/order.validators.js';
import {
  captureIncompleteOrderSchema,
  adminListIncompleteOrderQuerySchema,
  updateIncompleteOrderStatusSchema,
} from '../backend/validators/incompleteOrder.validators.js';
import { phoneLookupPattern } from '../backend/utils/phone.js';
import { customerIfPresent, requireAdmin, requireCustomer } from '../auth';
import type { Database, Tx } from '../db';
import { ApiError } from '../errors';
import { ok, type Ctx, type Router } from '../http';
import { dayKey } from '../lib/timezone';
import { ref } from '../populate';
import { assertId, create } from '../schemas';
import type { Doc } from '../types';
import { containsText, paginate, round2, sortDocs } from '../util';
import { validate } from '../validate';
import { isVisitorsCoupon, markProgress, rememberStatusChange, wasChangedInAdmin } from './progress';
import { availablePaymentMethods, settingsDoc } from './settings';
import { putBackStock, takeStock } from './stock';
import { startPayment } from './payments';

/** Orders, coupons at checkout and abandoned checkouts — order.service.js and its helpers, with the same rules. */

// ---------- Coupons (coupon.service.js)

/** What a coupon takes off a given subtotal — never more than the subtotal itself. */
export function discountFor(coupon: Doc, subtotal: number) {
  let discount = coupon.type === 'percentage' ? (subtotal * coupon.value) / 100 : coupon.value;
  if (coupon.maxDiscountAmount) discount = Math.min(discount, coupon.maxDiscountAmount);
  return round2(Math.min(discount, subtotal));
}

/** A date with no time of day means "through the end of that day". */
function expiryInstant(coupon: Doc) {
  const end = new Date(coupon.expiresAt);
  const isDateOnly = end.getUTCHours() === 0 && end.getUTCMinutes() === 0 && end.getUTCSeconds() === 0;
  return isDateOnly ? new Date(end.getTime() + 24 * 60 * 60 * 1000 - 1) : end;
}

/** Looks a coupon up and checks every rule against this subtotal, with messages a customer can act on. */
export function evaluateCoupon(db: Pick<Database, 'all'>, code: string, subtotal: number, now = new Date()) {
  const wanted = String(code).trim().toUpperCase();
  const coupon = db.all('coupons').find((c) => c.code === wanted && c.status === 'active');
  if (!coupon) throw ApiError.badRequest('Invalid or expired coupon code');
  if (coupon.startsAt && now < new Date(coupon.startsAt)) throw ApiError.badRequest('This coupon is not active yet');
  if (coupon.expiresAt && now > expiryInstant(coupon)) throw ApiError.badRequest('This coupon has expired');
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw ApiError.badRequest('This coupon has reached its usage limit');
  if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
    throw ApiError.badRequest(`Spend ৳${coupon.minOrderAmount.toLocaleString('en-US')} or more to use this coupon`);
  }
  return { coupon, discount: discountFor(coupon, subtotal) };
}

// ---------- Fraud scoring (fraud.service.js). The paid third-party lookup never runs in the demo.

function computeInternalScore(profile: Doc, orderValue: number) {
  const reasons: string[] = [];
  let score = 0;
  const total = profile.totalOrders;
  if (total > 0) {
    if (profile.cancelledOrders / total > 0.3) {
      score += 30;
      reasons.push('High cancellation rate on past orders');
    }
    if (profile.returnedOrders / total > 0.3) {
      score += 25;
      reasons.push('High return rate on past orders');
    }
    if (profile.unconfirmedCodOrders / total > 0.3) {
      score += 25;
      reasons.push('History of unconfirmed COD orders');
    }
  } else if (orderValue > 10000) {
    score += 15;
    reasons.push('First order from this phone number, high order value');
  }
  if (profile.flaggedManually) {
    score += 40;
    reasons.push('Manually flagged by an admin');
  }
  return { score: Math.min(score, 100), reasons };
}

const levelFromScore = (score: number) => (score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low');

function scoreOrder(tx: Tx, phone: string, orderValue: number) {
  const existing = tx.all('fraudprofiles').find((p) => p.phone === phone);
  const profile = existing ?? tx.insert('fraudprofiles', create('fraudprofiles', { phone }));
  const { score, reasons } = computeInternalScore(profile, orderValue);
  const level = levelFromScore(score);
  const updated = tx.edit('fraudprofiles', profile._id) as Doc;
  updated.totalOrders += 1;
  Object.assign(updated, { internalRiskScore: score, externalRiskScore: null, finalRiskScore: score, riskLevel: level });
  return { internalScore: score, externalScore: null, finalScore: score, level, reasons };
}

function recordOrderOutcome(tx: Tx, phone: string, { from, to, paymentMethod }: { from: string; to: string; paymentMethod: string }) {
  const profile = tx.all('fraudprofiles').find((p) => p.phone === phone);
  if (!profile) return;
  const inc: Record<string, number> = {};
  if (to === 'delivered') inc.deliveredOrders = 1;
  if (to === 'cancelled') inc.cancelledOrders = 1;
  if (to === 'returned') inc.returnedOrders = 1;
  if (to === 'cancelled' && from === 'pending' && paymentMethod === 'cod') inc.unconfirmedCodOrders = 1;
  if (Object.keys(inc).length === 0) return;
  const updated = tx.edit('fraudprofiles', profile._id) as Doc;
  for (const [key, n] of Object.entries(inc)) updated[key] = (updated[key] ?? 0) + n;
}

// ---------- Courier booking — simulated: the demo never books a real parcel.

const COURIER_CREDENTIALS: Record<string, (cfg: Doc | undefined) => boolean> = {
  steadfast: (cfg) => Boolean(cfg?.apiKey && cfg?.secretKey),
  pathao: (cfg) => Boolean(cfg?.clientId && cfg?.clientSecret && cfg?.username && cfg?.password && Number.parseInt(cfg?.storeId, 10) > 0),
  carrybee: (cfg) => Boolean(cfg?.clientId && cfg?.clientSecret && cfg?.clientContext && cfg?.storeId),
};

const needsBooking = (courier: Record<string, unknown> | undefined) => !courier?.consignmentId && courier?.status !== 'booked';

/**
 * Books the parcel with the store's default courier the way the real integration would — if that courier is switched on
 * and filled in — except that the booking is made up here: a consignment and a tracking code, no parcel.
 */
function bookCourier(settings: Doc): Record<string, string> {
  const key = settings.courier?.defaultProvider ?? 'steadfast';
  if (!COURIER_CREDENTIALS[key]) return { status: 'not_configured' };
  const cfg = settings.courier?.[key];
  if (!cfg?.enabled || !COURIER_CREDENTIALS[key](cfg)) return { provider: key, status: 'not_configured' };
  const digits = (n: number) => String(Math.floor(Math.random() * 10 ** n)).padStart(n, '0');
  return { provider: key, consignmentId: `DEMO-${digits(6)}`, trackingCode: `DM${digits(8)}`, status: 'in_review' };
}

// ---------- Placing an order

interface RequestedItem {
  product: string;
  variantSku?: string | null;
  title?: string;
  quantity: number;
}

/** Prices the items from the catalogue (never from the request) and checks they can be bought. Changes nothing. */
function priceItems(db: Pick<Database, 'get'>, requestedItems: RequestedItem[]) {
  const merged = new Map<string, RequestedItem>();
  for (const item of requestedItems) {
    const key = `${item.product}::${item.variantSku ?? ''}`;
    const existing = merged.get(key);
    if (existing) existing.quantity += item.quantity;
    else merged.set(key, { ...item });
  }

  return [...merged.values()].map((requested) => {
    const product = db.get('products', requested.product);
    if (!product || product.status !== 'active') {
      throw ApiError.badRequest(`Product unavailable: ${requested.title || requested.product}`);
    }

    let variant: Doc | null = null;
    if (product.productType === 'variable') {
      if (!requested.variantSku) throw ApiError.badRequest(`Please choose an option for ${product.title}`);
      variant = product.variants.find((v: Doc) => v.sku === requested.variantSku) ?? null;
      if (!variant) throw ApiError.badRequest(`That option of ${product.title} is no longer available`);
    } else if (requested.variantSku) {
      throw ApiError.badRequest(`That option of ${product.title} is no longer available`);
    }

    const variantLabel = variant ? variant.attributes.map((a: Doc) => a.value).join(' / ') : null;
    const available = variant ? variant.stock : product.stock;
    if (available < requested.quantity) {
      const name = `${product.title}${variantLabel ? ` (${variantLabel})` : ''}`;
      throw ApiError.badRequest(available > 0 ? `Only ${available} of ${name} left in stock` : `${name} is out of stock`);
    }

    return {
      product: product._id,
      title: product.title,
      variantSku: variant ? variant.sku : null,
      variantLabel,
      image: variant?.images?.[0]?.url || product.images?.[0]?.url,
      price: variant ? variant.price : product.basePrice,
      quantity: requested.quantity,
    };
  });
}

/** e.g. MRN-261016-482917, never one already used. */
function newOrderNumber(tx: Tx) {
  const day = dayKey(tx.now).slice(2).replaceAll('-', '');
  const taken = new Set(tx.all('orders').map((o) => o.orderNumber));
  for (;;) {
    const number = `MRN-${day}-${String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')}`;
    if (!taken.has(number)) return number;
  }
}

/** What a customer (or anyone who knows an order number and its phone) may see of an order. */
export function presentOrder(order: Doc) {
  return {
    id: order._id,
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    items: order.items.map((i: Doc) => ({
      product: i.product,
      title: i.title,
      variantSku: i.variantSku,
      variantLabel: i.variantLabel,
      image: i.image,
      price: i.price,
      quantity: i.quantity,
    })),
    shippingAddress: {
      fullAddress: order.shippingAddress.fullAddress,
      area: order.shippingAddress.area,
      phone: order.shippingAddress.phone,
    },
    pricing: {
      subtotal: order.pricing.subtotal,
      discount: order.pricing.discount,
      deliveryCharge: order.pricing.deliveryCharge,
      grandTotal: order.pricing.grandTotal,
    },
    coupon: order.coupon?.code ? { code: order.coupon.code, discountAmount: order.coupon.discountAmount } : undefined,
    // Admin notes on a status change are for staff, so only the status and time are shown.
    statusHistory: order.statusHistory.map((h: Doc) => ({ status: h.status, changedAt: h.changedAt })),
    courier: order.courier?.trackingCode
      ? { provider: order.courier.provider, trackingCode: order.courier.trackingCode, status: order.courier.status }
      : undefined,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function placeOrder(ctx: Ctx) {
  const customer = customerIfPresent(ctx.db);
  const { guestInfo, items, shippingAddress, paymentMethod, couponCode } = validate(createOrderSchema, ctx.body);

  if (!items || items.length === 0) throw ApiError.badRequest('Your cart is empty');
  if (!customer && (!guestInfo?.name || !guestInfo?.phone)) {
    throw ApiError.badRequest('Name and phone are required for guest checkout');
  }

  return ctx.write((tx) => {
    const settings = settingsDoc(tx);
    if (!availablePaymentMethods(settings.paymentGateways).includes(paymentMethod)) {
      throw ApiError.badRequest('Selected payment method is not available');
    }

    // 1. Everything that can be checked without changing anything.
    const lineItems = priceItems(tx, items);
    const subtotal = lineItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const deliveryCharge =
      shippingAddress.area === 'inside_dhaka' ? settings.deliveryCharges.insideDhaka : settings.deliveryCharges.outsideDhaka;
    // A coupon the customer typed that no longer works is an error — the total they were shown included the discount.
    const applied = couponCode ? evaluateCoupon(tx, couponCode, subtotal) : null;
    const discount = applied?.discount ?? 0;
    const grandTotal = subtotal - discount + deliveryCharge;

    // 2. Take the stock and the coupon redemption. If anything fails after this, the whole change is rolled back.
    const reserved = lineItems.map((line) => {
      const taken = takeStock(tx, { productId: line.product, variantSku: line.variantSku, quantity: line.quantity });
      if (!taken) {
        throw ApiError.badRequest(`${line.title}${line.variantLabel ? ` (${line.variantLabel})` : ''} just sold out — please review your cart`);
      }
      return { line, resultingStock: taken.resultingStock };
    });

    if (applied) {
      const coupon = tx.get('coupons', applied.coupon._id) as Doc;
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw ApiError.badRequest('This coupon has reached its usage limit');
      (tx.edit('coupons', coupon._id) as Doc).usedCount += 1;
    }

    const fraudRisk = scoreOrder(tx, shippingAddress.phone, grandTotal);

    const order = tx.insert('orders', create('orders', {
      orderNumber: newOrderNumber(tx),
      customer: customer?._id ?? null,
      guestInfo: customer ? undefined : guestInfo,
      items: lineItems,
      shippingAddress,
      pricing: { subtotal, discount, deliveryCharge, grandTotal },
      coupon: applied ? { code: applied.coupon.code, discountAmount: discount } : undefined,
      paymentMethod,
      paymentStatus: 'pending',
      orderStatus: 'pending',
      statusHistory: [{ status: 'pending', note: 'Order placed', changedAt: tx.now }],
      fraudRisk,
    }));

    // 3. The bookkeeping (afterOrderPlaced): the stock log, the sales counters, the analytics funnel, abandoned checkouts.
    for (const { line, resultingStock } of reserved) {
      tx.insert('inventorylogs', create('inventorylogs', {
        product: line.product,
        variantSku: line.variantSku,
        changeType: 'sale',
        quantityChange: -line.quantity,
        resultingStock,
        note: `Order ${order.orderNumber}`,
      }));
    }
    for (const item of order.items) {
      const product = tx.edit('products', item.product);
      if (!product) continue;
      product.purchaseCount += item.quantity;
      product.revenueTotal += item.price * item.quantity;
    }
    tx.addEvents(
      order.items.map((item: Doc) => ({
        type: 'purchase' as const,
        product: item.product,
        variantSku: item.variantSku ?? null,
        quantity: item.quantity,
        amount: item.price * item.quantity,
        sessionId: ctx.visitorId,
        date: dayKey(order.createdAt),
        createdAt: order.createdAt,
      }))
    );
    for (const pending of tx.all('incompleteorders').filter((o) => o.phone === shippingAddress.phone && o.status === 'pending')) {
      (tx.edit('incompleteorders', pending._id) as Doc).status = 'recovered';
    }

    markProgress(tx, 'order');
    if (applied && isVisitorsCoupon(tx, applied.coupon.code)) markProgress(tx, 'coupon');
    tx.note('order.placed', {
      orderNumber: order.orderNumber,
      total: grandTotal,
      customer: customer?.name ?? guestInfo?.name ?? 'Customer',
      items: order.items.length,
    });
    return ok({ orderNumber: order.orderNumber, id: order._id }, { status: 201, message: 'Order placed successfully' });
  });
}

// ---------- Status changes

/** Statuses in which an order no longer holds any stock. */
const RELEASES_STOCK = new Set(['cancelled', 'returned']);

function releaseOrderStock(tx: Tx, order: Doc, reason: string) {
  order.stockReleased = true;
  for (const item of order.items) {
    const back = putBackStock(tx, { productId: item.product, variantSku: item.variantSku, quantity: item.quantity });
    if (!back) continue; // the product has since been deleted — nothing to restock
    tx.insert('inventorylogs', create('inventorylogs', {
      product: item.product,
      variantSku: item.variantSku,
      changeType: 'return',
      quantityChange: item.quantity,
      resultingStock: back.resultingStock,
      note: `Order ${order.orderNumber} ${reason}`,
    }));
    const product = tx.edit('products', item.product) as Doc;
    product.purchaseCount -= item.quantity;
    product.revenueTotal -= item.price * item.quantity;
  }
}

/** Takes a cancelled or returned order's stock out again; if a line can't be covered, nothing changes. */
function reinstateOrderStock(tx: Tx, order: Doc) {
  order.stockReleased = false;
  for (const item of order.items) {
    const taken = takeStock(tx, { productId: item.product, variantSku: item.variantSku, quantity: item.quantity });
    if (!taken) {
      throw ApiError.badRequest(
        `Not enough stock of ${item.title}${item.variantLabel ? ` (${item.variantLabel})` : ''} to reinstate this order`
      );
    }
    tx.insert('inventorylogs', create('inventorylogs', {
      product: item.product,
      variantSku: item.variantSku,
      changeType: 'sale',
      quantityChange: -item.quantity,
      resultingStock: taken.resultingStock,
      note: `Order ${order.orderNumber} reinstated`,
    }));
    const product = tx.edit('products', item.product) as Doc;
    product.purchaseCount += item.quantity;
    product.revenueTotal += item.price * item.quantity;
  }
}

function changeStatus(tx: Tx, id: string, status: string, note: string | undefined, adminId: string) {
  const current = tx.get('orders', id);
  if (!current) throw ApiError.notFound('Order not found');
  const previousStatus = current.orderStatus;
  if (status === previousStatus) return current;
  if (previousStatus === 'delivered' && status === 'cancelled') {
    throw ApiError.badRequest("A delivered order can't be cancelled — mark it as returned instead");
  }

  const order = tx.edit('orders', id) as Doc;
  // Cancelling or returning puts the stock back; moving out of those statuses takes it out again — each exactly once.
  if (RELEASES_STOCK.has(status) && !order.stockReleased) releaseOrderStock(tx, order, status);
  else if (!RELEASES_STOCK.has(status) && order.stockReleased) reinstateOrderStock(tx, order);

  order.orderStatus = status;
  order.statusHistory.push({ status, ...(note !== undefined ? { note } : {}), changedAt: tx.now, changedBy: adminId });

  // The courier is booked the first time an order moves into processing.
  let response: Doc = order;
  if (status === 'processing' && needsBooking(order.courier)) {
    order.courier = bookCourier(settingsDoc(tx));
    // A signed-in customer's name lives on their account — the API fills it in for the parcel (and the reply shows it).
    if (!order.guestInfo?.name && order.customer) response = { ...order, customer: ref(tx, 'users', order.customer, ['name', 'phone']) };
  }

  recordOrderOutcome(tx, order.shippingAddress.phone, { from: previousStatus, to: status, paymentMethod: order.paymentMethod });
  rememberStatusChange(tx, order._id);
  tx.note('order.status', { orderNumber: order.orderNumber, status });
  return response;
}

export function applyPaymentResult(tx: Tx, orderId: string, result: { success: boolean; transactionId?: string | null; raw: unknown }) {
  const order = tx.edit('orders', orderId) as Doc;
  order.paymentStatus = result.success ? 'paid' : 'failed';
  order.paymentDetails = { ...order.paymentDetails };
  if (result.transactionId) order.paymentDetails.transactionId = result.transactionId;
  order.paymentDetails.gatewayResponse = result.raw;
  if (result.success) {
    order.paymentDetails.paidAt = tx.now;
    tx.note('order.paid', { orderNumber: order.orderNumber, total: order.pricing.grandTotal, method: order.paymentMethod });
  }
  return order;
}

// ---------- Routes

const withCustomer = (db: Database, order: Doc) => ({ ...order, customer: order.customer ? ref(db, 'users', order.customer, ['name', 'phone']) : null });

export function orderRoutes(router: Router) {
  router.get('/orders/track', (ctx) => {
    const { orderNumber, phone } = ctx.query as { orderNumber?: string; phone?: string };
    if (!orderNumber || !phone) throw ApiError.badRequest('orderNumber and phone are required');
    const notFound = () => ApiError.notFound('No order found with that order number and phone number');

    // The phone is matched on its digits, so "+8801712345678" finds an order placed as "01712-345678".
    const pattern = phoneLookupPattern(phone);
    if (!pattern) throw notFound();
    const wanted = String(orderNumber).trim().toUpperCase();
    const order = ctx.db.find(
      'orders',
      (o) => o.orderNumber === wanted && (pattern.test(o.shippingAddress?.phone ?? '') || pattern.test(o.guestInfo?.phone ?? ''))
    );
    if (!order) throw notFound();
    if (wasChangedInAdmin(ctx.db, order._id)) ctx.write((tx) => markProgress(tx, 'status'));
    return ok(presentOrder(order));
  });

  router.get('/orders/my', ({ db }) => {
    const user = requireCustomer(db);
    return ok(sortDocs(db.filter('orders', (o) => o.customer === user._id), { createdAt: -1 }).map(presentOrder));
  });

  router.get('/orders/admin', ({ db, query }) => {
    requireAdmin(db);
    const { status, paymentStatus, q, page = 1, limit = 20 } = validate(adminOrderQuerySchema, query);
    const orders = sortDocs(
      db.filter(
        'orders',
        (o) => (!status || o.orderStatus === status) && (!paymentStatus || o.paymentStatus === paymentStatus) && (!q || containsText(o.orderNumber, q))
      ),
      { createdAt: -1 }
    );
    const { items, meta } = paginate(orders, page, limit);
    return ok(items.map((o) => withCustomer(db, o)), { meta });
  });

  router.get('/orders/admin/:id', ({ db, params }) => {
    requireAdmin(db);
    assertId(params.id);
    const order = db.get('orders', params.id);
    if (!order) throw ApiError.notFound('Order not found');
    return ok(withCustomer(db, order));
  });

  router.patch('/orders/admin/:id/status', (ctx) => {
    const admin = requireAdmin(ctx.db);
    const { status, note } = validate(updateOrderStatusSchema, ctx.body);
    assertId(ctx.params.id);
    return ctx.write((tx) => ok(changeStatus(tx, ctx.params.id, status, note, admin._id), { message: 'Order status updated' }));
  });

  router.patch('/orders/admin/:id/payment', (ctx) => {
    requireAdmin(ctx.db);
    const { paymentStatus, transactionId } = validate(updateOrderPaymentSchema, ctx.body);
    assertId(ctx.params.id);
    return ctx.write((tx) => {
      const order = tx.edit('orders', ctx.params.id);
      if (!order) throw ApiError.notFound('Order not found');
      order.paymentStatus = paymentStatus;
      order.paymentDetails = { ...order.paymentDetails };
      if (transactionId) order.paymentDetails.transactionId = transactionId;
      if (paymentStatus === 'paid') order.paymentDetails.paidAt = tx.now;
      return ok(order, { message: 'Payment status updated' });
    });
  });

  router.post('/orders', placeOrder);

  router.post('/orders/:id/pay/:provider', async (ctx) => {
    assertId(ctx.params.id);
    const order = ctx.db.get('orders', ctx.params.id);
    if (!order) throw ApiError.notFound('Order not found');
    if (order.paymentMethod !== ctx.params.provider) throw ApiError.badRequest('This order was not placed with that payment method');
    if (order.paymentStatus === 'paid') throw ApiError.badRequest('This order is already paid');
    if (['cancelled', 'returned'].includes(order.orderStatus)) throw ApiError.badRequest('This order has been cancelled');
    const online = ['paystation', 'bkash', 'nagad'].includes(ctx.params.provider);
    if (!online || !availablePaymentMethods(settingsDoc(ctx.db).paymentGateways).includes(ctx.params.provider)) {
      throw ApiError.badRequest('This payment method is not available');
    }

    const { redirectUrl, reference } = await startPayment(ctx, order);
    return ctx.write((tx) => {
      const pending = tx.edit('orders', order._id) as Doc;
      pending.paymentDetails = { ...pending.paymentDetails, transactionId: reference };
      return ok({ redirectUrl });
    });
  });

  router.get('/orders/:id', ({ db, params }) => {
    const user = requireCustomer(db);
    assertId(params.id);
    const order = db.find('orders', (o) => o._id === params.id && o.customer === user._id);
    if (!order) throw ApiError.notFound('Order not found');
    return ok(presentOrder(order));
  });

  // ---------- Coupons at checkout

  /** Does this code work for a cart with this subtotal, and what would it take off? Nothing is used up here. */
  router.post('/coupons/validate', ({ db, body }) => {
    const { code, subtotal } = validate(validateCouponSchema, body);
    const { coupon, discount } = evaluateCoupon(db, code, subtotal);
    return ok({ code: coupon.code, type: coupon.type, value: coupon.value, discount }, { message: 'Coupon applied' });
  });

  // ---------- Abandoned checkouts

  router.post('/incomplete-orders', (ctx) => {
    const body = validate(captureIncompleteOrderSchema, ctx.body);
    return ctx.write((tx) => {
      const existing = tx.all('incompleteorders').find((o) => o.phone === body.phone && o.status === 'pending');
      if (existing) {
        const capture = tx.edit('incompleteorders', existing._id) as Doc;
        Object.assign(capture, create('incompleteorders', { ...capture, ...structuredClone(body), status: 'pending' }));
      } else {
        tx.insert('incompleteorders', create('incompleteorders', { ...body, status: 'pending' }));
      }
      return ok(null, { status: 201, message: 'Captured' });
    });
  });

  router.get('/incomplete-orders', ({ db, query }) => {
    requireAdmin(db);
    const { status, page = 1, limit = 20 } = validate(adminListIncompleteOrderQuerySchema, query);
    const { items, meta } = paginate(sortDocs(db.filter('incompleteorders', (o) => !status || o.status === status), { createdAt: -1 }), page, limit);
    return ok(items, { meta });
  });

  router.patch('/incomplete-orders/:id/status', (ctx) => {
    requireAdmin(ctx.db);
    const { status } = validate(updateIncompleteOrderStatusSchema, ctx.body);
    assertId(ctx.params.id);
    return ctx.write((tx) => {
      const capture = tx.edit('incompleteorders', ctx.params.id);
      if (!capture) throw ApiError.notFound('Incomplete order not found');
      capture.status = status;
      return ok(capture, { message: 'Status updated' });
    });
  });
}
