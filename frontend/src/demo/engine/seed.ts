import { COLLECTIONS, type AnalyticsEvent, type CollectionName, type Doc } from './types';
import { addDays, dayKey } from './lib/timezone';
import { recomputeStockStatus } from './handlers/stock';

/** The sample shop as backend/src/scripts/export-demo-seed.js writes it. */
export interface SeedFile {
  format: number;
  /** The snapshot's "now": 23:55 in the store's timezone on the day it was made. */
  generatedAt: string;
  collections: Partial<Record<CollectionName, Doc[]>>;
  analyticsEvents: { columns: string[]; rows: unknown[][] };
}

export interface PreparedSeed {
  collections: Record<CollectionName, Doc[]>;
  events: AnalyticsEvent[];
  shiftMs: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const DAY_MS = 86_400_000;

// A time stored as a bare number of milliseconds (the sample-activity generator once wrote `paymentDetails.paidAt` that way; the
// API's schema reads it back as a date). Fields named "…At" with a value in the 2001–2096 range are dates, and move like the rest.
const isEpochMs = (key: string, value: unknown): value is number =>
  typeof value === 'number' && /At$/.test(key) && value > 1e12 && value < 4e12;

function shiftDates<T>(value: T, ms: number, key = ''): T {
  if (isEpochMs(key, value)) return new Date(value + ms).toISOString() as T;
  if (typeof value === 'string') return (ISO_DATE.test(value) ? new Date(Date.parse(value) + ms).toISOString() : value) as T;
  if (Array.isArray(value)) return value.map((v) => shiftDates(v, ms, key)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shiftDates(v, ms, k)])) as T;
  }
  return value;
}

const daysBetween = (fromKey: string, toKey: string) => Math.round((Date.parse(toKey) - Date.parse(fromKey)) / DAY_MS);

/**
 * The sample shop, moved to the visitor's today: every date goes forward by the whole days since the snapshot was made (so
 * the activity keeps its time of day and "today" is today), and whatever would then still lie in the future is left out —
 * an order placed tonight in the snapshot hasn't happened yet this morning. Stock, sales counters and coupon use are
 * brought in line with what is left, and order numbers carry their new dates.
 */
export function prepareSeed(seed: SeedFile, passwordHash: string, now = Date.now()): PreparedSeed {
  const days = daysBetween(dayKey(seed.generatedAt), dayKey(now));
  const shiftMs = days * DAY_MS;
  const nowIso = new Date(now).toISOString();
  const isPast = (iso: unknown) => typeof iso === 'string' && iso <= nowIso;
  const clamp = (iso: unknown) => (typeof iso === 'string' && iso > nowIso ? nowIso : iso);

  const collections = Object.fromEntries(
    COLLECTIONS.map((name) => [name, shiftDates(seed.collections[name] ?? [], shiftMs)])
  ) as Record<CollectionName, Doc[]>;

  // ---- Orders: the future ones go, and give back the stock they held; the rest are renumbered for their new dates.
  const products = new Map(collections.products.map((p) => [p._id, p]));
  const renumbered = new Map<string, string>();
  const kept: Doc[] = [];
  for (const order of collections.orders) {
    if (!isPast(order.createdAt)) {
      if (!order.stockReleased) {
        for (const item of order.items) {
          const product = products.get(item.product);
          const variant = item.variantSku ? product?.variants?.find((v: Doc) => v.sku === item.variantSku) : null;
          if (variant) variant.stock += item.quantity;
          else if (product) product.stock += item.quantity;
        }
      }
      continue;
    }
    const match = /^MRN-(\d{2})(\d{2})(\d{2})-(\d+)$/.exec(order.orderNumber);
    if (match) {
      const day = addDays(`20${match[1]}-${match[2]}-${match[3]}`, days).slice(2).replaceAll('-', '');
      const number = `MRN-${day}-${match[4]}`;
      renumbered.set(order.orderNumber, number);
      order.orderNumber = number;
    }
    for (const entry of order.statusHistory ?? []) entry.changedAt = clamp(entry.changedAt);
    order.updatedAt = clamp(order.updatedAt);
    if (order.paymentDetails?.paidAt) order.paymentDetails.paidAt = clamp(order.paymentDetails.paidAt);
    kept.push(order);
  }
  collections.orders = kept;

  const renumber = (note: unknown) =>
    typeof note === 'string' ? note.replace(/MRN-\d{6}-\d+/, (n) => renumbered.get(n) ?? n) : note;
  collections.inventorylogs = collections.inventorylogs
    .filter((log) => isPast(log.createdAt))
    .map((log) => ({ ...log, note: renumber(log.note) }));
  collections.incompleteorders = collections.incompleteorders.filter((o) => isPast(o.createdAt));

  // ---- Analytics events, from rows to objects, with their day recomputed in the store's timezone.
  const { columns, rows } = seed.analyticsEvents;
  const events: AnalyticsEvent[] = [];
  for (const row of rows) {
    const raw = Object.fromEntries(columns.map((c, i) => [c, row[i]])) as Record<string, unknown>;
    const createdAt = new Date(Date.parse(String(raw.createdAt)) + shiftMs).toISOString();
    if (createdAt > nowIso) continue;
    events.push({
      type: raw.type as AnalyticsEvent['type'],
      product: String(raw.product),
      variantSku: (raw.variantSku as string | null) ?? null,
      quantity: Number(raw.quantity ?? 1),
      amount: Number(raw.amount ?? 0),
      sessionId: (raw.sessionId as string | null) ?? null,
      date: dayKey(createdAt),
      createdAt,
    });
  }

  // ---- The products' lifetime counters and the coupons' use, from what is left.
  for (const product of products.values()) {
    Object.assign(product, { viewCount: 0, addToCartCount: 0, purchaseCount: 0, revenueTotal: 0 });
    recomputeStockStatus(product);
  }
  for (const event of events) {
    const product = products.get(event.product);
    if (!product) continue;
    if (event.type === 'view') product.viewCount += 1;
    if (event.type === 'add_to_cart') product.addToCartCount += 1;
  }
  const couponUse = new Map<string, number>();
  for (const order of kept) {
    if (order.coupon?.code) couponUse.set(order.coupon.code, (couponUse.get(order.coupon.code) ?? 0) + 1);
    if (order.orderStatus === 'cancelled' || order.orderStatus === 'returned') continue;
    for (const item of order.items) {
      const product = products.get(item.product);
      if (!product) continue;
      product.purchaseCount += item.quantity;
      product.revenueTotal += item.price * item.quantity;
    }
  }
  for (const coupon of collections.coupons) coupon.usedCount = couponUse.get(coupon.code) ?? 0;

  // ---- The documented demo sign-ins (the snapshot carries no passwords).
  for (const account of [...collections.admins, ...collections.users]) account.passwordHash = passwordHash;

  collections.sessions = [];
  collections.demo = [{ _id: 'progress', steps: {}, completedAt: null }];
  return { collections, events, shiftMs };
}
