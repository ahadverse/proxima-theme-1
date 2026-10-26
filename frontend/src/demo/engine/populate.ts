import type { Database } from './db';
import type { CollectionName, Doc } from './types';
import { clone, omit, pick } from './util';

/*
 * Mongoose's populate(), for the references the API fills in. A single reference to a document that no longer exists
 * becomes null; in a list of references, missing ones are left out — as Mongoose does.
 */

export function ref(db: Pick<Database, 'get'>, name: CollectionName, id: unknown, fields: string[]): Doc | null {
  const doc = db.get(name, id);
  return doc ? pick(doc, fields) : null;
}

const ATTRIBUTE_FIELDS = ['name', 'slug', 'type'];

// What the storefront never receives: the admin dashboard's sales and traffic counters (product.service PUBLIC_SELECT).
const PRIVATE_COUNTERS = ['viewCount', 'addToCartCount', 'purchaseCount', 'revenueTotal'];

/**
 * A product as the API sends it. The storefront's reads leave out the counters and don't fill in `attributesUsed`
 * (STOREFRONT_POPULATE); the admin's fill in everything (PUBLIC_POPULATE).
 */
export function presentProduct(db: Database, product: Doc, audience: 'storefront' | 'admin'): Doc {
  const out = audience === 'storefront' ? omit(product, PRIVATE_COUNTERS) : clone(product);
  out.category = ref(db, 'categories', product.category, ['name', 'slug']);
  if (product.brand !== undefined && product.brand !== null) out.brand = ref(db, 'brands', product.brand, ['name', 'slug', 'logo']);
  if (audience === 'admin') {
    out.attributesUsed = (product.attributesUsed ?? [])
      .map((id: string) => ref(db, 'attributes', id, ATTRIBUTE_FIELDS))
      .filter(Boolean);
  }
  out.variants = (out.variants ?? []).map((variant: Doc) => ({
    ...variant,
    attributes: (variant.attributes ?? []).map((a: Doc) => ({ ...a, attribute: ref(db, 'attributes', a.attribute, ATTRIBUTE_FIELDS) })),
  }));
  return out;
}
