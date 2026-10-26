/**
 * A stored record, shaped exactly like the API's JSON for it (Mongoose's toJSON): `_id` as a hex string, dates as ISO
 * strings, references as ids. The engine reads and writes these freely, the way the API's services use their documents.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Doc = { _id: string; [field: string]: any };

/** The collections the engine keeps, named as the API's MongoDB collections are. */
export const COLLECTIONS = [
  'admins',
  'attributes',
  'banners',
  'blogs',
  'brands',
  'categories',
  'coupons',
  'faqs',
  'fraudprofiles',
  'incompleteorders',
  'inventorylogs',
  'orders',
  'pages',
  'products',
  'reviews',
  'settings',
  'users',
  /** Who is signed in on this browser: the customer on the shop and the admin on the demo admin (the API's cookies). */
  'sessions',
  /** The demo's own state: the "try it" checklist and the activity feed. */
  'demo',
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

/** One storefront event (the API's AnalyticsEvent), kept apart from the documents: there are thousands and none is ever read by id. */
export interface AnalyticsEvent {
  type: 'view' | 'add_to_cart' | 'purchase';
  product: string;
  variantSku: string | null;
  quantity: number;
  amount: number;
  sessionId: string | null;
  /** The store-timezone day it happened on, 'YYYY-MM-DD'. */
  date: string;
  createdAt: string;
}

/** Which app is calling: the storefront or the admin panel (each has its own sign-in, as each has its own cookie). */
export type AppName = 'shop' | 'admin';

export interface EngineRequest {
  app: AppName;
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /** Below /api/v1, with the query string: "/products?category=phones&page=2". */
  path: string;
  body?: unknown;
}

export interface EngineResponse {
  status: number;
  body: unknown;
}

/** Something a visitor did that the other app may want to show at once (a toast, a badge). */
export interface ActivityEvent {
  kind: 'order.placed' | 'order.status' | 'order.paid' | 'review.submitted' | 'checklist.done';
  at: string;
  [detail: string]: unknown;
}

/** Told to every open tab after a change: what changed, and who made it. */
export interface ChangeNotice {
  rev: number;
  collections: string[];
  /** The connection that made the change, or null when it came from another tab or a reset. */
  source: string | null;
  activity: ActivityEvent[];
  reset?: boolean;
}
