import type { Doc } from './types';

const hex = (n: number, width: number) => n.toString(16).padStart(width, '0');
const processPart = Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => hex(b, 2)).join('');
let counter = crypto.getRandomValues(new Uint32Array(1))[0] & 0xffffff;

/**
 * A new id in MongoDB's ObjectId format (seconds + a per-process random part + a counter, 24 hex digits) — the apps
 * check ids against that shape, and ids made now sort after the sample data's, as they would on the real shop.
 */
export function newId(at = Date.now()): string {
  counter = (counter + 1) & 0xffffff;
  return hex(Math.floor(at / 1000), 8) + processPart + hex(counter, 6);
}

export const isObjectId = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);

export const nowIso = () => new Date().toISOString();

export const clone = <T>(value: T): T => structuredClone(value);

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Escapes user input for use inside a RegExp (search boxes), as the API's escapeRegex does. */
export const escapeRegex = (text: string) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A case-insensitive "contains" test — Mongo's `{ $regex: escapeRegex(q), $options: 'i' }`. */
export function containsText(value: unknown, q: string): boolean {
  return typeof value === 'string' && new RegExp(escapeRegex(q), 'i').test(value);
}

export function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => (acc as Record<string, unknown> | undefined)?.[key], obj);
}

export function setByPath(obj: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split('.');
  const last = keys.pop() as string;
  let target = obj;
  for (const key of keys) {
    if (!target[key] || typeof target[key] !== 'object') target[key] = {};
    target = target[key] as Record<string, unknown>;
  }
  target[last] = value;
}

/** The listed fields of a document, plus its `_id` — what a Mongoose `select('a b')` returns. */
export function pick(doc: Doc, fields: string[]): Doc {
  const out: Doc = { _id: doc._id };
  for (const field of fields) {
    if (field.includes('.')) {
      const value = getByPath(doc, field);
      if (value !== undefined) setByPath(out, field, clone(value));
    } else if (doc[field] !== undefined) {
      out[field] = clone(doc[field]);
    }
  }
  return out;
}

/** A copy of the document without the listed top-level fields — a Mongoose `select('-a -b')`. */
export function omit(doc: Doc, fields: string[]): Doc {
  const out = clone(doc);
  for (const field of fields) delete out[field];
  return out;
}

/** Mongo's sort order for one field: missing/null first when ascending, then numbers and strings by value. */
export function compareValues(a: unknown, b: unknown): number {
  const missingA = a === undefined || a === null;
  const missingB = b === undefined || b === null;
  if (missingA || missingB) return missingA === missingB ? 0 : missingA ? -1 : 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}

export type SortSpec = Record<string, 1 | -1>;

/** Sorts like Mongo's `.sort({ a: 1, b: -1 })`; ties keep their stored (insertion) order, as Mongo's natural order does. */
export function sortDocs<T extends Doc>(docs: T[], spec: SortSpec): T[] {
  const keys = Object.entries(spec);
  return docs
    .map((doc, index) => ({ doc, index }))
    .sort((x, y) => {
      for (const [key, dir] of keys) {
        const diff = compareValues(getByPath(x.doc, key), getByPath(y.doc, key));
        if (diff !== 0) return diff * dir;
      }
      return x.index - y.index;
    })
    .map((entry) => entry.doc);
}

/** One page of a list, with the meta block the API sends with it. */
export function paginate<T>(items: T[], page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  return {
    items: items.slice(skip, skip + limit),
    meta: { total: items.length, page, limit, pages: Math.ceil(items.length / limit) },
  };
}
