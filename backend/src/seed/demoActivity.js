import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { AnalyticsEvent } from '../models/AnalyticsEvent.js';
import { InventoryLog } from '../models/InventoryLog.js';
import { IncompleteOrder } from '../models/IncompleteOrder.js';
import { Coupon } from '../models/Coupon.js';
import { User } from '../models/User.js';
import { Review } from '../models/Review.js';
import { env } from '../config/env.js';
import { getSettingsDoc } from '../services/settings.service.js';
import { dayKey, recentDayKeys, startOfDay } from '../utils/timezone.js';

/**
 * A believable two months of store activity — orders in every status, the browse → cart → buy funnel,
 * stock movements, abandoned checkouts, coupons and a few reviews — so the live demo's Dashboard,
 * Analytics, Orders and Inventory pages are never empty. Everything here is obviously fake (made-up
 * names, 019-prefixed numbers, DEMO- tracking codes) and is rebuilt by the nightly demo reset.
 *
 * Stock levels are not touched: the movements are logged to end exactly at each product's current
 * stock, so the Inventory activity agrees with the catalogue.
 */

// Two months, so the Analytics "vs the previous 30 days" comparison has something to compare with.
const DAYS = 60;
const TZ = env.storeTimezone;

// A tiny seeded PRNG: the same day always produces the same shape, so a reset doesn't make the
// demo's numbers jump around from one morning to the next.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES = [
  'Rahim Uddin', 'Nusrat Jahan', 'Tanvir Ahmed', 'Farzana Akter', 'Sabbir Hossain', 'Mim Chowdhury',
  'Arif Rahman', 'Sadia Islam', 'Imran Khan', 'Tasnim Sultana', 'Mahmudul Hasan', 'Ritu Das',
  'Kamal Hossain', 'Jannat Ferdous', 'Shakil Mia', 'Maliha Rahman', 'Fahim Reza', 'Lamia Karim',
  'Rakib Hasan', 'Afsana Mim', 'Naeem Siddique', 'Sumaiya Noor', 'Zahid Alam', 'Priya Sarker',
];
const ADDRESSES = [
  ['House 14, Road 5, Dhanmondi, Dhaka', 'inside_dhaka'],
  ['Flat 4B, Block C, Bashundhara R/A, Dhaka', 'inside_dhaka'],
  ['House 22, Sector 7, Uttara, Dhaka', 'inside_dhaka'],
  ['Mirpur 10, Section 11, Dhaka', 'inside_dhaka'],
  ['Banani, Road 11, Dhaka', 'inside_dhaka'],
  ['Agrabad Commercial Area, Chattogram', 'outside_dhaka'],
  ['Zindabazar, Sylhet', 'outside_dhaka'],
  ['Sonadanga, Khulna', 'outside_dhaka'],
  ['Station Road, Rajshahi', 'outside_dhaka'],
  ['Kandirpar, Cumilla', 'outside_dhaka'],
];
const METHODS = ['cod', 'cod', 'cod', 'cod', 'cod', 'bkash', 'bkash', 'nagad', 'paystation', 'paystation'];

const pick = (rand, list) => list[Math.floor(rand() * list.length)];
const between = (rand, lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

function weightedPicker(rand, items, weightOf) {
  const weights = items.map(weightOf);
  const total = weights.reduce((a, b) => a + b, 0);
  return () => {
    let r = rand() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  };
}

function statusFor(rand, ageDays) {
  const r = rand();
  if (ageDays >= 6) return r < 0.8 ? 'delivered' : r < 0.88 ? 'cancelled' : 'returned';
  if (ageDays >= 2) return r < 0.4 ? 'delivered' : r < 0.75 ? 'shipped' : r < 0.9 ? 'processing' : 'cancelled';
  return r < 0.4 ? 'pending' : r < 0.65 ? 'confirmed' : r < 0.85 ? 'processing' : r < 0.95 ? 'shipped' : 'cancelled';
}

const FLOW = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

function historyFor(status, placedAt, rand) {
  const path = status === 'cancelled' ? ['pending', 'cancelled'] : status === 'returned' ? [...FLOW, 'returned'] : FLOW.slice(0, FLOW.indexOf(status) + 1);
  let at = placedAt.getTime();
  return path.map((s) => {
    const entry = { status: s, changedAt: new Date(at) };
    at += between(rand, 40, 600) * 60 * 1000;
    return entry;
  });
}

function variantLabelOf(variant) {
  return (variant?.attributes ?? []).map((a) => a.value).filter(Boolean).join(' / ') || null;
}

/**
 * An order number in the shop's format, dated the day the order was placed (as a real one would be), never one already
 * handed out: two months of orders under one date prefix would otherwise clash on the unique index now and then.
 */
function orderNumbers(rand) {
  const used = new Set();
  return (placedAt) => {
    const day = dayKey(placedAt, TZ).slice(2).replaceAll('-', '');
    for (;;) {
      const number = `MRN-${day}-${String(between(rand, 0, 999999)).padStart(6, '0')}`;
      if (!used.has(number)) {
        used.add(number);
        return number;
      }
    }
  };
}

export async function seedDemoActivity() {
  const products = await Product.find({ status: 'active' }).lean();
  if (products.length === 0) return;

  const today = dayKey(new Date(), TZ);
  const rand = mulberry32(Number(today.replaceAll('-', '')));
  const settings = await getSettingsDoc();
  const delivery = settings.deliveryCharges ?? { insideDhaka: 100, outsideDhaka: 150 };
  const now = Date.now();

  const popular = weightedPicker(rand, products, (p) => (1 + (p.isBestSeller ? 4 : 0) + (p.isTrending ? 3 : 0) + (p.isFeatured ? 1 : 0)) / Math.sqrt(1 + p.basePrice / 6000));
  const orderNumberFor = orderNumbers(rand);

  // ---- coupons first, so some orders can carry one
  const coupons = [
    { code: 'WELCOME10', type: 'percentage', value: 10, minOrderAmount: 1000, maxDiscountAmount: 500, usageLimit: null, status: 'active' },
    { code: 'SAVE200', type: 'fixed', value: 200, minOrderAmount: 3000, usageLimit: 200, status: 'active' },
    { code: 'EID15', type: 'percentage', value: 15, minOrderAmount: 2000, maxDiscountAmount: 1500, usageLimit: 100, status: 'inactive', expiresAt: new Date(now - 20 * 86400000) },
  ];
  const usage = { WELCOME10: 0, SAVE200: 0, EID15: 0 };

  const orders = [];
  const events = [];
  const counters = new Map(); // productId -> { views, carts, units, revenue }
  const bump = (id, key, n = 1) => {
    const c = counters.get(String(id)) ?? { views: 0, carts: 0, units: 0, revenue: 0 };
    c[key] += n;
    counters.set(String(id), c);
  };
  const saleLogs = []; // newest first, filled as orders are generated oldest -> newest, reversed later

  const dayKeys = recentDayKeys(DAYS, TZ);
  for (const [index, key] of dayKeys.entries()) {
    const ageDays = DAYS - 1 - index;
    const dayStart = startOfDay(key, TZ).getTime();
    const dayEnd = Math.min(dayStart + 86400000, now);
    if (dayEnd <= dayStart) continue;
    const weekday = new Date(dayStart + 6 * 3600000).getUTCDay();
    const weekend = weekday === 5 || weekday === 6;
    const growth = 0.75 + (index / DAYS) * 0.5;
    const fraction = (dayEnd - dayStart) / 86400000;
    const orderCount = Math.max(1, Math.round((5 + rand() * 6) * growth * (weekend ? 1.25 : 1) * fraction));
    const cartOnly = Math.round(orderCount * (1.4 + rand() * 1.2));
    const browsers = Math.round(orderCount * (5 + rand() * 4));

    // Evening-heavy: most shopping happens after work.
    const moment = () => {
      const h = rand() < 0.65 ? between(rand, 17, 23) : between(rand, 9, 16);
      const t = dayStart + h * 3600000 + between(rand, 0, 3599) * 1000;
      return new Date(Math.min(t, dayEnd - 1000));
    };
    const view = (sessionId, product, at) => {
      events.push({ type: 'view', product: product._id, variantSku: null, quantity: 1, amount: 0, sessionId, date: key, createdAt: at, updatedAt: at });
      bump(product._id, 'views');
    };
    const cart = (sessionId, product, variant, qty, at) => {
      const price = variant?.price ?? product.basePrice;
      events.push({ type: 'add_to_cart', product: product._id, variantSku: variant?.sku ?? null, quantity: qty, amount: price * qty, sessionId, date: key, createdAt: at, updatedAt: at });
      bump(product._id, 'carts');
    };

    for (let i = 0; i < orderCount; i++) {
      const sessionId = `demo-${key}-b${i}`;
      const placedAt = moment();
      const lines = [];
      for (let n = between(rand, 1, rand() < 0.8 ? 1 : 3); n > 0; n--) {
        const product = popular();
        if (lines.some((l) => String(l.product._id) === String(product._id))) continue;
        const variant = product.productType === 'variable' && product.variants?.length ? pick(rand, product.variants) : null;
        lines.push({ product, variant, quantity: rand() < 0.85 ? 1 : 2 });
      }
      const viewedAt = new Date(placedAt.getTime() - between(rand, 4, 40) * 60000);
      for (const l of lines) {
        view(sessionId, l.product, viewedAt);
        cart(sessionId, l.product, l.variant, l.quantity, new Date(placedAt.getTime() - between(rand, 1, 3) * 60000));
      }

      const items = lines.map(({ product, variant, quantity }) => ({
        product: product._id,
        title: product.title,
        variantSku: variant?.sku ?? null,
        variantLabel: variantLabelOf(variant),
        image: variant?.images?.[0]?.url ?? product.images?.[0]?.url,
        price: variant?.price ?? product.basePrice,
        quantity,
      }));
      const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
      const [fullAddress, area] = pick(rand, ADDRESSES);
      const deliveryCharge = area === 'inside_dhaka' ? delivery.insideDhaka : delivery.outsideDhaka;

      let coupon;
      let discount = 0;
      if (rand() < 0.14 && subtotal >= 1000) {
        const code = subtotal >= 3000 && rand() < 0.4 ? 'SAVE200' : 'WELCOME10';
        discount = code === 'SAVE200' ? 200 : Math.min(Math.round(subtotal * 0.1), 500);
        coupon = { code, discountAmount: discount };
        usage[code] += 1;
      }

      const status = statusFor(rand, ageDays);
      const paymentMethod = pick(rand, METHODS);
      const prepaid = paymentMethod !== 'cod';
      const paymentStatus = prepaid ? (status === 'cancelled' || status === 'returned' ? 'refunded' : 'paid') : status === 'delivered' ? 'paid' : 'pending';
      const phone = `019${String(between(rand, 0, 99999999)).padStart(8, '0')}`;
      const name = pick(rand, NAMES);
      const orderRisk = rand();
      const level = orderRisk < 0.03 ? 'high' : orderRisk < 0.1 ? 'medium' : 'low';
      const score = level === 'high' ? between(rand, 70, 90) : level === 'medium' ? between(rand, 40, 60) : between(rand, 0, 25);

      const history = historyFor(status, placedAt, rand);
      const shipped = ['shipped', 'delivered', 'returned'].includes(status);
      const booked = shipped || status === 'processing';

      orders.push({
        doc: {
          orderNumber: orderNumberFor(placedAt),
          customer: null,
          guestInfo: { name, email: rand() < 0.5 ? `${name.split(' ')[0].toLowerCase()}${between(rand, 1, 99)}@example.com` : undefined, phone },
          items,
          shippingAddress: { fullAddress, area, phone },
          pricing: { subtotal, discount, deliveryCharge, grandTotal: subtotal - discount + deliveryCharge },
          coupon,
          paymentMethod,
          paymentStatus,
          paymentDetails: prepaid && paymentStatus !== 'pending' ? { transactionId: `DEMO-${between(rand, 100000, 999999)}`, gatewayResponse: { demo: true }, paidAt: new Date(placedAt) } : {},
          orderStatus: status,
          statusHistory: history,
          courier: booked
            ? { provider: 'steadfast', consignmentId: `DEMO-${between(rand, 10000, 99999)}`, trackingCode: `DEMO${between(rand, 100000, 999999)}`, status: status === 'delivered' ? 'delivered' : status === 'returned' ? 'cancelled' : 'in_review' }
            : undefined,
          fraudRisk: {
            internalScore: score,
            finalScore: score,
            level,
            reasons: level === 'high' ? ['First order from this number', 'High-value cash on delivery'] : level === 'medium' ? ['First order from this number'] : [],
          },
          stockReleased: status === 'cancelled' || status === 'returned',
          pixelEventsSent: { purchase: false, lead: false },
          createdAt: placedAt,
          updatedAt: history[history.length - 1].changedAt,
        },
      });

      for (const it of items) {
        events.push({ type: 'purchase', product: it.product, variantSku: it.variantSku, quantity: it.quantity, amount: it.price * it.quantity, sessionId, date: key, createdAt: placedAt, updatedAt: placedAt });
        saleLogs.push({ product: it.product, variantSku: it.variantSku, quantity: it.quantity, note: `Order ${orders[orders.length - 1].doc.orderNumber}`, at: placedAt });
        if (status !== 'cancelled' && status !== 'returned') {
          bump(it.product, 'units', it.quantity);
          bump(it.product, 'revenue', it.price * it.quantity);
        }
      }
    }

    // Visitors who added something to the cart but never ordered, and people who only browsed.
    for (let i = 0; i < cartOnly; i++) {
      const sessionId = `demo-${key}-c${i}`;
      const product = popular();
      const variant = product.productType === 'variable' && product.variants?.length ? pick(rand, product.variants) : null;
      const at = moment();
      view(sessionId, product, new Date(at.getTime() - 5 * 60000));
      cart(sessionId, product, variant, 1, at);
    }
    for (let i = 0; i < browsers; i++) {
      const sessionId = `demo-${key}-v${i}`;
      const at = moment();
      for (let n = between(rand, 1, 4); n > 0; n--) view(sessionId, popular(), new Date(at.getTime() + n * 60000));
    }
  }

  // ---- write everything (raw inserts so the historical timestamps are kept as given)
  const docs = orders.map(({ doc }) => {
    const raw = new Order(doc).toObject();
    raw.createdAt = doc.createdAt;
    raw.updatedAt = doc.updatedAt;
    return raw;
  });
  if (docs.length) await Order.collection.insertMany(docs);
  for (let i = 0; i < events.length; i += 2000) await AnalyticsEvent.collection.insertMany(events.slice(i, i + 2000).map((e) => ({ ...e })));

  await Coupon.insertMany(coupons.map((c) => ({ ...c, usedCount: usage[c.code] ?? 0 })));

  await Product.bulkWrite(
    [...counters.entries()].map(([id, c]) => ({
      updateOne: { filter: { _id: id }, update: { $set: { viewCount: c.views, addToCartCount: c.carts, purchaseCount: c.units, revenueTotal: c.revenue } } },
    }))
  );

  // Stock movements, newest first, each remembering what was left after it — the newest ends at the
  // product's real current stock. Cancelled orders are left out of the log; their stock came back.
  const live = new Map(products.map((p) => [String(p._id), p]));
  const running = new Map();
  const logs = [];
  const sellable = new Map(orders.map(({ doc }) => [doc.orderNumber, !doc.stockReleased]));
  const sold = saleLogs.filter((s) => sellable.get(s.note.replace('Order ', ''))).sort((a, b) => b.at - a.at);
  for (const sale of sold) {
    const key = `${sale.product}|${sale.variantSku ?? ''}`;
    const p = live.get(String(sale.product));
    const base = sale.variantSku ? (p?.variants ?? []).find((v) => v.sku === sale.variantSku)?.stock ?? 0 : p?.stock ?? 0;
    const after = running.has(key) ? running.get(key) : base;
    logs.push({ product: sale.product, variantSku: sale.variantSku, changeType: 'sale', quantityChange: -sale.quantity, resultingStock: after, note: sale.note, createdAt: sale.at, updatedAt: sale.at });
    running.set(key, after + sale.quantity);
  }
  if (logs.length) await InventoryLog.collection.insertMany(logs);

  // ---- abandoned checkouts
  const abandoned = [];
  for (let i = 0; i < 7; i++) {
    const product = popular();
    const at = new Date(now - between(rand, 20, 70 * 60) * 60000);
    const quantity = 1;
    abandoned.push({
      name: i % 3 === 2 ? undefined : pick(rand, NAMES),
      phone: `019${String(between(rand, 0, 99999999)).padStart(8, '0')}`,
      address: i % 2 ? pick(rand, ADDRESSES)[0] : undefined,
      cartSnapshot: [{ product: product._id, title: product.title, quantity, price: product.basePrice }],
      totalValue: product.basePrice * quantity,
      lastStep: pick(rand, ['cart', 'address', 'payment']),
      status: i < 4 ? 'pending' : i === 4 ? 'contacted' : i === 5 ? 'recovered' : 'abandoned',
      createdAt: at,
      updatedAt: at,
    });
  }
  await IncompleteOrder.collection.insertMany(abandoned.map((a) => ({ ...a })));

  // ---- a few customers with reviews (some approved, some waiting in the moderation queue)
  const passwordHash = await User.hashPassword(`demo-${Math.random()}-not-for-login`);
  const reviewers = await User.insertMany(
    ['Anika Rahman', 'Shafin Ahmed', 'Mousumi Akter'].map((name, i) => ({
      name,
      phone: `0190000000${i + 1}`,
      email: `demo.customer${i + 1}@example.com`,
      passwordHash,
      isVerified: true,
    }))
  );
  const topProducts = [...counters.entries()].sort((a, b) => b[1].units - a[1].units).slice(0, 6).map(([id]) => id);
  const reviewText = [
    [5, 'Exactly as described', 'Arrived well packed and works perfectly. Delivery was quicker than I expected.'],
    [4, 'Good value', 'Solid build for the price. Took a star off only because the box was a bit dented.'],
    [5, 'Highly recommended', 'Genuine product with a proper warranty card. Will order again.'],
    [4, 'Happy with it', 'Does everything I need. Customer support answered my question within the hour.'],
    [3, 'Decent', 'Fine for the price but I expected a little more. Delivery was on time.'],
    [5, 'Love it', 'Better than the photos. Setup took two minutes.'],
  ];
  await Review.insertMany(
    topProducts.slice(0, 6).map((product, i) => ({
      product,
      customer: reviewers[i % reviewers.length]._id,
      rating: reviewText[i][0],
      title: reviewText[i][1],
      comment: reviewText[i][2],
      isApproved: i < 3,
    }))
  );
}

