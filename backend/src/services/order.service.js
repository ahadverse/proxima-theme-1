import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { InventoryLog } from '../models/InventoryLog.js';
import { IncompleteOrder } from '../models/IncompleteOrder.js';
import { ApiError } from '../utils/ApiError.js';
import { generateOrderNumber } from '../utils/orderNumber.js';
import { getSettingsDoc } from './settings.service.js';
import { getAvailableProviders } from './payments/index.js';
import * as fraudService from './fraud.service.js';
import * as courierService from './courier/index.js';
import * as pixelService from './pixel.service.js';
import * as analyticsService from './analytics.service.js';
import * as couponService from './coupon.service.js';
import * as stockService from './stock.service.js';
import { logger } from '../utils/logger.js';
import { escapeRegex } from '../utils/slugify.js';
import { phoneLookupPattern } from '../utils/phone.js';

/**
 * Prices the requested items from the catalogue (never from the request) and checks they can be
 * bought. Changes nothing. Repeated lines for the same product/variant are merged.
 */
async function priceItems(requestedItems) {
  const merged = new Map();
  for (const item of requestedItems) {
    const key = `${item.product}::${item.variantSku ?? ''}`;
    const existing = merged.get(key);
    if (existing) existing.quantity += item.quantity;
    else merged.set(key, { ...item });
  }

  const lines = [];
  for (const requested of merged.values()) {
    const product = await Product.findById(requested.product);
    if (!product || product.status !== 'active') {
      throw ApiError.badRequest(`Product unavailable: ${requested.title || requested.product}`);
    }

    let variant = null;
    if (product.productType === 'variable') {
      if (!requested.variantSku) throw ApiError.badRequest(`Please choose an option for ${product.title}`);
      variant = product.variants.find((v) => v.sku === requested.variantSku);
      if (!variant) throw ApiError.badRequest(`That option of ${product.title} is no longer available`);
    } else if (requested.variantSku) {
      throw ApiError.badRequest(`That option of ${product.title} is no longer available`);
    }

    const variantLabel = variant ? variant.attributes.map((a) => a.value).join(' / ') : null;
    const available = variant ? variant.stock : product.stock;
    if (available < requested.quantity) {
      throw ApiError.badRequest(
        available > 0
          ? `Only ${available} of ${product.title}${variantLabel ? ` (${variantLabel})` : ''} left in stock`
          : `${product.title}${variantLabel ? ` (${variantLabel})` : ''} is out of stock`
      );
    }

    lines.push({
      product: product._id,
      title: product.title,
      variantSku: variant ? variant.sku : null,
      variantLabel,
      image: requested.image || variant?.images?.[0]?.url || product.images?.[0]?.url,
      price: variant ? variant.price : product.basePrice,
      quantity: requested.quantity,
    });
  }

  return lines;
}

/** Writes the order, retrying with a fresh number on the (rare) clash with an existing one. */
async function insertOrder(fields) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await Order.create({ ...fields, orderNumber: generateOrderNumber() });
    } catch (err) {
      const isNumberClash = err.code === 11000 && err.keyPattern?.orderNumber;
      if (!isNumberClash) throw err;
    }
  }
  throw ApiError.internal('Could not allocate an order number — please try again');
}

export async function createOrder(payload, { userId, sessionId, client } = {}) {
  const { guestInfo, items, shippingAddress, paymentMethod, couponCode } = payload;

  if (!items || items.length === 0) throw ApiError.badRequest('Your cart is empty');
  if (!userId && (!guestInfo?.name || !guestInfo?.phone)) {
    throw ApiError.badRequest('Name and phone are required for guest checkout');
  }

  const settings = await getSettingsDoc();
  const available = getAvailableProviders(settings.paymentGateways);
  if (!available.includes(paymentMethod)) {
    throw ApiError.badRequest('Selected payment method is not available');
  }

  // 1. Everything that can be checked without changing anything.
  const lineItems = await priceItems(items);
  const subtotal = lineItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const deliveryCharge =
    shippingAddress.area === 'inside_dhaka'
      ? settings.deliveryCharges.insideDhaka
      : settings.deliveryCharges.outsideDhaka;

  let appliedCoupon = null;
  let discount = 0;
  if (couponCode) {
    // A coupon the customer typed that no longer works is an error, not something to quietly drop —
    // the total they were shown included the discount.
    ({ coupon: appliedCoupon, discount } = await couponService.evaluateCoupon(couponCode, subtotal));
  }
  const grandTotal = subtotal - discount + deliveryCharge;

  // 2. Take the stock and the coupon redemption. Each is one atomic step; if anything later fails,
  // everything taken so far is given back, so a failed order never leaves stock or a coupon use behind.
  const reserved = [];
  let redeemedCoupon = null;
  try {
    for (const line of lineItems) {
      const taken = await stockService.takeStock({
        productId: line.product,
        variantSku: line.variantSku,
        quantity: line.quantity,
      });
      if (!taken) {
        throw ApiError.badRequest(
          `${line.title}${line.variantLabel ? ` (${line.variantLabel})` : ''} just sold out — please review your cart`
        );
      }
      reserved.push({ line, resultingStock: taken.resultingStock });
    }

    if (appliedCoupon) redeemedCoupon = await couponService.redeemCoupon(appliedCoupon);

    const fraudRisk = await fraudService.scoreOrder(
      { phone: shippingAddress.phone, orderValue: grandTotal },
      settings
    );

    const order = await insertOrder({
      customer: userId || null,
      guestInfo: userId ? undefined : guestInfo,
      items: lineItems,
      shippingAddress,
      pricing: { subtotal, discount, deliveryCharge, grandTotal },
      coupon: appliedCoupon ? { code: appliedCoupon.code, discountAmount: discount } : undefined,
      paymentMethod,
      paymentStatus: 'pending',
      orderStatus: 'pending',
      statusHistory: [{ status: 'pending', note: 'Order placed' }],
      fraudRisk: {
        internalScore: fraudRisk.internalScore,
        externalScore: fraudRisk.externalScore,
        finalScore: fraudRisk.finalScore,
        level: fraudRisk.level,
        reasons: fraudRisk.reasons,
      },
    });

    await afterOrderPlaced(order, { reserved, settings, sessionId, shippingAddress, client });
    return order;
  } catch (err) {
    await Promise.all([
      ...reserved.map(({ line }) =>
        stockService
          .putBackStock({ productId: line.product, variantSku: line.variantSku, quantity: line.quantity })
          .catch((e) => logger.error('Could not give back stock after a failed order:', e))
      ),
      redeemedCoupon
        ? couponService.releaseCoupon(redeemedCoupon).catch((e) => logger.error('Could not release coupon:', e))
        : null,
    ]);
    throw err;
  }
}

/** The bookkeeping after an order exists. None of it may fail the order, so each part is isolated. */
async function afterOrderPlaced(order, { reserved, settings, sessionId, shippingAddress, client }) {
  const safely = (label, work) =>
    Promise.resolve()
      .then(work)
      .catch((err) => logger.warn(`Order ${order.orderNumber}: ${label} failed:`, err.message));

  await Promise.all([
    // The audit trail for the stock that was taken.
    safely('inventory log', () =>
      InventoryLog.insertMany(
        reserved.map(({ line, resultingStock }) => ({
          product: line.product,
          variantSku: line.variantSku,
          changeType: 'sale',
          quantityChange: -line.quantity,
          resultingStock,
          note: `Order ${order.orderNumber}`,
        }))
      )
    ),
    // Per-product sales counters (they feed "trending" and the dashboard's top products).
    safely('sales counters', () =>
      Promise.all(
        order.items.map((item) =>
          Product.updateOne(
            { _id: item.product },
            { $inc: { purchaseCount: item.quantity, revenueTotal: item.price * item.quantity } }
          )
        )
      )
    ),
    // Purchase events for the analytics funnel.
    safely('analytics', () => analyticsService.recordPurchase(order, sessionId)),
    // This phone just completed checkout — any captured abandonment for it is no longer "lost".
    safely('incomplete-order recovery', () =>
      IncompleteOrder.updateMany({ phone: shippingAddress.phone, status: 'pending' }, { status: 'recovered' })
    ),
    // Server-side Conversions API Purchase event. Cash on delivery is a purchase as soon as it is placed;
    // an online payment only becomes one when the gateway confirms it (see reportPaidPurchase), so an
    // abandoned gateway page never reaches the ad account — matching when the browser pixel fires.
    safely('conversions API', () => (order.paymentMethod === 'cod' ? sendPurchaseToMeta(order, settings, client) : null)),
  ]);
}

async function sendPurchaseToMeta(order, settings, client) {
  const sent = await pixelService.sendPurchaseEvent(order, settings, client);
  if (sent) await Order.updateOne({ _id: order._id }, { 'pixelEventsSent.purchase': true });
}

/** Tells Meta about an online-paid order once its payment is confirmed. Never throws; reports each order once. */
export async function reportPaidPurchase(order, client) {
  if (order.pixelEventsSent?.purchase) return;
  try {
    await sendPurchaseToMeta(order, await getSettingsDoc(), client);
  } catch (err) {
    logger.warn(`Order ${order.orderNumber}: conversions API failed:`, err.message);
  }
}

export async function getOrderById(id) {
  return Order.findById(id);
}

/**
 * Resolves which order a payment gateway's callback redirect refers to. The query string is attacker
 * controlled and Express parses `?order_id[$ne]=x` into an object, so only plain strings are ever
 * allowed into a database filter.
 */
export async function findOrderForPaymentCallback(query) {
  const text = (value) => (typeof value === 'string' && value.length > 0 && value.length <= 100 ? value : null);

  // PayStation's redirect carries our invoice as `invoice_number`.
  const orderNumber = text(query.invoice) || text(query.invoice_number) || text(query.order_id) || text(query.merchantInvoiceNumber);
  if (orderNumber) {
    const order = await Order.findOne({ orderNumber });
    if (order) return order;

    // PayStation invoices are "<orderNumber>-<attempt>" (one per payment attempt), which is all its IPN carries.
    const attempt = orderNumber.match(/^(.+)-[a-z0-9]{4,10}$/i);
    if (attempt) {
      const base = await Order.findOne({ orderNumber: attempt[1] });
      if (base) return base;
    }

    // Nagad only takes alphanumeric order ids, so it hands "MRN-261016-482917" back as "MRN261016482917".
    if (/^[A-Za-z0-9]{5,20}$/.test(orderNumber)) {
      const compact = await Order.findOne({ orderNumber: new RegExp(`^${[...orderNumber].join('-?')}$`) });
      if (compact) return compact;
    }
  }

  const reference = text(query.paymentID) || text(query.paymentId) || text(query.payment_ref_id);
  if (reference) return Order.findOne({ 'paymentDetails.transactionId': reference });

  return null;
}

export async function setPendingPaymentReference(order, reference) {
  order.paymentDetails.transactionId = reference;
  await order.save();
}

export async function applyPaymentResult(order, result) {
  order.paymentStatus = result.success ? 'paid' : 'failed';
  if (result.transactionId) order.paymentDetails.transactionId = result.transactionId;
  order.paymentDetails.gatewayResponse = result.raw;
  if (result.success) order.paymentDetails.paidAt = new Date();
  await order.save();
  return order;
}

export async function getMyOrders(userId) {
  return Order.find({ customer: userId }).sort({ createdAt: -1 });
}

export async function getOrderForCustomer(id, userId) {
  const order = await Order.findOne({ _id: id, customer: userId });
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}

export async function trackOrder(orderNumber, phone) {
  const notFound = () => ApiError.notFound('No order found with that order number and phone number');

  // The phone is matched on its digits, so "+8801712345678" finds an order placed as "01712-345678".
  const pattern = phoneLookupPattern(phone);
  if (!pattern) throw notFound();

  const order = await Order.findOne({
    orderNumber: String(orderNumber).trim().toUpperCase(),
    $or: [{ 'shippingAddress.phone': pattern }, { 'guestInfo.phone': pattern }],
  });
  if (!order) throw notFound();
  return order;
}

export async function listOrdersAdmin(filters = {}) {
  const { status, paymentStatus, q, page = 1, limit = 20 } = filters;
  const query = {};
  if (status) query.orderStatus = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (q) query.orderNumber = { $regex: escapeRegex(q), $options: 'i' };

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('customer', 'name phone'),
    Order.countDocuments(query),
  ]);

  return { items, meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) } };
}

export async function getOrderByIdAdmin(id) {
  const order = await Order.findById(id).populate('customer', 'name phone');
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}

/** Statuses in which an order no longer holds any stock. */
const RELEASES_STOCK = new Set(['cancelled', 'returned']);

/** Gives an order's stock back — it was cancelled or returned — and takes it off the sales counters. */
async function releaseOrderStock(order, reason) {
  for (const item of order.items) {
    const back = await stockService.putBackStock({
      productId: item.product,
      variantSku: item.variantSku,
      quantity: item.quantity,
    });
    if (!back) continue; // the product has since been deleted — nothing to restock

    await InventoryLog.create({
      product: item.product,
      variantSku: item.variantSku,
      changeType: 'return',
      quantityChange: item.quantity,
      resultingStock: back.resultingStock,
      note: `Order ${order.orderNumber} ${reason}`,
    });
    await Product.updateOne(
      { _id: item.product },
      { $inc: { purchaseCount: -item.quantity, revenueTotal: -(item.price * item.quantity) } }
    );
  }
  order.stockReleased = true;
}

/**
 * Takes an order's stock out again — it was cancelled or returned and is now being reinstated. If
 * any line can't be covered anymore nothing is taken and the status change is refused.
 */
async function reinstateOrderStock(order) {
  const taken = [];
  try {
    for (const item of order.items) {
      const result = await stockService.takeStock({
        productId: item.product,
        variantSku: item.variantSku,
        quantity: item.quantity,
      });
      if (!result) {
        throw ApiError.badRequest(
          `Not enough stock of ${item.title}${item.variantLabel ? ` (${item.variantLabel})` : ''} to reinstate this order`
        );
      }
      taken.push({ item, resultingStock: result.resultingStock });
    }
  } catch (err) {
    await Promise.all(
      taken.map(({ item }) =>
        stockService
          .putBackStock({ productId: item.product, variantSku: item.variantSku, quantity: item.quantity })
          .catch((e) => logger.error('Could not undo a partial reinstatement:', e))
      )
    );
    throw err;
  }

  for (const { item, resultingStock } of taken) {
    await InventoryLog.create({
      product: item.product,
      variantSku: item.variantSku,
      changeType: 'sale',
      quantityChange: -item.quantity,
      resultingStock,
      note: `Order ${order.orderNumber} reinstated`,
    });
    await Product.updateOne(
      { _id: item.product },
      { $inc: { purchaseCount: item.quantity, revenueTotal: item.price * item.quantity } }
    );
  }
  order.stockReleased = false;
}

export async function updateOrderStatus(id, status, note) {
  const order = await Order.findById(id);
  if (!order) throw ApiError.notFound('Order not found');

  const previousStatus = order.orderStatus;
  if (status === previousStatus) return order;
  if (previousStatus === 'delivered' && status === 'cancelled') {
    throw ApiError.badRequest("A delivered order can't be cancelled — mark it as returned instead");
  }

  // Cancelling or returning an order puts its stock back; moving it out of those statuses takes it
  // out again. `stockReleased` makes each happen exactly once, however the status is flipped.
  if (RELEASES_STOCK.has(status) && !order.stockReleased) await releaseOrderStock(order, status);
  else if (!RELEASES_STOCK.has(status) && order.stockReleased) await reinstateOrderStock(order);

  order.orderStatus = status;
  order.statusHistory.push({ status, note });

  // Auto-book the courier consignment the first time an order moves into processing — piggybacks
  // on this existing admin-protected route so a future admin "Orders" UI gets it for free.
  if (status === 'processing' && courierService.needsBooking(order.courier)) {
    const settings = await getSettingsDoc();
    // A signed-in customer's name lives on their account, not on the order — the parcel needs it.
    if (!order.guestInfo?.name) await order.populate('customer', 'name phone');
    order.courier = await courierService.createConsignment(order, settings);
  }

  await order.save();

  await fraudService.recordOrderOutcome(order.shippingAddress.phone, {
    from: previousStatus,
    to: status,
    paymentMethod: order.paymentMethod,
  });

  return order;
}

export async function updateOrderPayment(id, { paymentStatus, transactionId }) {
  const order = await Order.findById(id);
  if (!order) throw ApiError.notFound('Order not found');

  order.paymentStatus = paymentStatus;
  if (transactionId) order.paymentDetails.transactionId = transactionId;
  if (paymentStatus === 'paid') order.paymentDetails.paidAt = new Date();
  await order.save();
  return order;
}

/**
 * What a customer (or anyone who knows an order number and its phone) may see of an order. The
 * stored document also carries the fraud assessment, the payment gateway's raw responses and
 * internal notes — none of which belong in a public response.
 */
export function presentOrder(order) {
  return {
    id: order._id.toString(),
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    items: order.items.map((i) => ({
      product: i.product?.toString(),
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
    statusHistory: order.statusHistory.map((h) => ({ status: h.status, changedAt: h.changedAt })),
    courier: order.courier?.trackingCode
      ? { provider: order.courier.provider, trackingCode: order.courier.trackingCode, status: order.courier.status }
      : undefined,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
