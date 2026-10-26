import { ApiError } from './errors';
import type { Database } from './db';
import type { CollectionName, Doc } from './types';
import { isObjectId, newId } from './util';

/*
 * What the API's Mongoose models add to a document when it is created — defaults, ids on sub-documents, trimmed and
 * lower-cased strings — so a record made in the demo has the very shape the API would give it. One function per model in
 * backend/src/models.
 */

type Fields = Record<string, unknown>;

/** Fields left undefined are dropped (Mongoose doesn't store them). */
function compact<T extends Fields>(doc: T): T {
  for (const key of Object.keys(doc)) if (doc[key] === undefined) delete doc[key];
  return doc;
}

const trim = (v: unknown) => (typeof v === 'string' ? v.trim() : v);
const lower = (v: unknown) => (typeof v === 'string' ? v.toLowerCase() : v);
const withId = (sub: Fields) => ({ _id: (sub._id as string | undefined) ?? newId(), ...sub });

/** Mongoose's `minimize`: an empty nested object isn't stored. */
function minimized(value: unknown): Fields | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const entries = Object.entries(value).filter(([, v]) => v !== undefined);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

export const models = {
  admins: (f: Fields) =>
    compact({ ...f, name: trim(f.name), email: lower(trim(f.email)), role: f.role ?? 'staff', isActive: f.isActive ?? true, tokenVersion: f.tokenVersion ?? 0 }),

  attributes: (f: Fields) =>
    compact({
      ...f,
      name: trim(f.name),
      slug: lower(f.slug),
      type: f.type ?? 'text',
      values: ((f.values as Fields[] | undefined) ?? []).map((v) => withId(compact({ ...v, sortOrder: v.sortOrder ?? 0 }))),
    }),

  banners: (f: Fields) => compact({ ...f, highlights: f.highlights ?? [], sortOrder: f.sortOrder ?? 0, status: f.status ?? 'active' }),

  blogs: (f: Fields) =>
    compact({ ...f, title: trim(f.title), slug: lower(f.slug), tags: f.tags ?? [], status: f.status ?? 'draft', seo: minimized(f.seo) }),

  brands: (f: Fields) =>
    compact({ ...f, name: trim(f.name), slug: lower(f.slug), isFeatured: f.isFeatured ?? false, sortOrder: f.sortOrder ?? 0, status: f.status ?? 'active' }),

  categories: (f: Fields) =>
    compact({
      ...f,
      name: trim(f.name),
      slug: lower(f.slug),
      parent: f.parent ?? null,
      isFeatured: f.isFeatured ?? false,
      sortOrder: f.sortOrder ?? 0,
      status: f.status ?? 'active',
    }),

  coupons: (f: Fields) =>
    compact({
      ...f,
      code: typeof f.code === 'string' ? f.code.trim().toUpperCase() : f.code,
      minOrderAmount: f.minOrderAmount ?? 0,
      maxDiscountAmount: f.maxDiscountAmount ?? null,
      usageLimit: f.usageLimit ?? null,
      usedCount: f.usedCount ?? 0,
      status: f.status ?? 'active',
    }),

  faqs: (f: Fields) => compact({ ...f, sortOrder: f.sortOrder ?? 0, status: f.status ?? 'active' }),

  fraudprofiles: (f: Fields) =>
    compact({
      totalOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      returnedOrders: 0,
      unconfirmedCodOrders: 0,
      internalRiskScore: 0,
      externalRiskScore: null,
      externalRaw: null,
      finalRiskScore: 0,
      riskLevel: 'low',
      flaggedManually: false,
      ...f,
    }),

  incompleteorders: (f: Fields) =>
    compact({
      ...f,
      cartSnapshot: ((f.cartSnapshot as Fields[] | undefined) ?? []).map((item) => withId(compact({ ...item }))),
      totalValue: f.totalValue ?? 0,
      lastStep: f.lastStep ?? 'cart',
      status: f.status ?? 'pending',
    }),

  inventorylogs: (f: Fields) => compact({ ...f, variantSku: f.variantSku ?? null, changedBy: f.changedBy ?? null }),

  orders: (f: Fields) =>
    compact({
      ...f,
      customer: f.customer ?? null,
      guestInfo: minimized(f.guestInfo),
      items: ((f.items as Fields[] | undefined) ?? []).map((item) =>
        compact({ ...item, variantSku: item.variantSku ?? null, variantLabel: item.variantLabel ?? null })
      ),
      pricing: { discount: 0, deliveryCharge: 0, ...(f.pricing as Fields) },
      coupon: { discountAmount: 0, ...minimized(f.coupon) },
      paymentStatus: f.paymentStatus ?? 'pending',
      paymentDetails: minimized(f.paymentDetails),
      orderStatus: f.orderStatus ?? 'pending',
      statusHistory: f.statusHistory ?? [],
      courier: minimized(f.courier),
      fraudRisk: { internalScore: 0, externalScore: null, finalScore: 0, level: 'low', reasons: [], ...minimized(f.fraudRisk) },
      stockReleased: f.stockReleased ?? false,
      pixelEventsSent: { purchase: false, lead: false, ...minimized(f.pixelEventsSent) },
    }),

  pages: (f: Fields) => compact({ ...f, slug: lower(f.slug), content: f.content ?? '', contentFormat: f.contentFormat ?? 'markdown' }),

  products: (f: Fields) =>
    compact({
      ...f,
      title: trim(f.title),
      slug: lower(f.slug),
      productType: f.productType ?? 'simple',
      description: f.description ?? '',
      shortHighlights: f.shortHighlights ?? [],
      images: f.images ?? [],
      stock: f.stock ?? 0,
      lowStockThreshold: f.lowStockThreshold ?? 5,
      stockStatus: f.stockStatus ?? 'in_stock',
      attributesUsed: f.attributesUsed ?? [],
      variants: ((f.variants as Fields[] | undefined) ?? []).map(productVariant),
      specifications: f.specifications ?? [],
      warrantyInfo: f.warrantyInfo ?? '',
      isFlashSale: f.isFlashSale ?? false,
      isTrending: f.isTrending ?? false,
      isBestSeller: f.isBestSeller ?? false,
      isNewArrival: f.isNewArrival ?? false,
      isFeatured: f.isFeatured ?? false,
      ratingsAverage: f.ratingsAverage ?? 0,
      ratingsCount: f.ratingsCount ?? 0,
      viewCount: f.viewCount ?? 0,
      addToCartCount: f.addToCartCount ?? 0,
      purchaseCount: f.purchaseCount ?? 0,
      revenueTotal: f.revenueTotal ?? 0,
      seo: { noIndex: false, ...minimized(f.seo) },
      status: f.status ?? 'active',
    }),

  reviews: (f: Fields) => compact({ ...f, order: f.order ?? null, title: trim(f.title), isApproved: f.isApproved ?? false }),

  users: (f: Fields) =>
    compact({
      ...f,
      name: trim(f.name),
      email: lower(trim(f.email)),
      phone: trim(f.phone),
      addresses: ((f.addresses as Fields[] | undefined) ?? []).map(userAddress),
      wishlist: f.wishlist ?? [],
      isVerified: f.isVerified ?? false,
      isActive: f.isActive ?? true,
      tokenVersion: f.tokenVersion ?? 0,
    }),
} satisfies Partial<Record<CollectionName, (f: Fields) => Fields>>;

export function productVariant(v: Fields): Fields {
  return withId(
    compact({
      ...v,
      attributes: ((v.attributes as Fields[] | undefined) ?? []).map((a) => compact({ ...a })),
      stock: v.stock ?? 0,
      lowStockThreshold: v.lowStockThreshold ?? 5,
      images: v.images ?? [],
    })
  );
}

export function userAddress(a: Fields): Fields {
  return withId(compact({ ...a, label: a.label ?? 'Home', area: a.area ?? 'inside_dhaka', isDefault: a.isDefault ?? false }));
}

/** A unique index: another document with the same value is a 409, worded as the API's error handler words it. */
export function assertUnique(
  db: Pick<Database, 'all'>,
  name: CollectionName,
  field: string,
  value: unknown,
  exceptId?: string
) {
  if (value === undefined || value === null) return;
  if (db.all(name).some((d) => d[field] === value && d._id !== exceptId)) throw ApiError.conflict(`${field} already exists`);
}

/** A path id that can't be an ObjectId is a 400 from Mongoose's cast, before anything is looked up. */
export function assertId(id: unknown, path = '_id'): asserts id is string {
  if (!isObjectId(id)) throw ApiError.badRequest(`Invalid value for ${path}`);
}

/** Mongoose's cast of a reference field in a create or an update. */
export function assertRef(value: unknown, path: string) {
  if (value === undefined || value === null) return;
  if (!isObjectId(value)) throw ApiError.badRequest('Validation failed', { [path]: `Cast to ObjectId failed for value "${String(value)}"` });
}

export type ModelName = keyof typeof models;
/** A new document's fields, as the model would store them (the id and timestamps are added when it is inserted). */
export const create = (name: ModelName, fields: Fields): Doc => models[name](fields) as unknown as Doc;
