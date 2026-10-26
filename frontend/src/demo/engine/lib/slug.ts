import slugifyLib from 'slugify';
import type { Database } from '../db';
import type { CollectionName } from '../types';

/** The API's toSlug (utils/slugify.js), with the same library and options. */
export function toSlug(text: unknown): string {
  return slugifyLib(String(text ?? ''), { lower: true, strict: true, trim: true });
}

/** The API's uniqueSlug: counts up (-2, -3, …) past slugs already taken; `fallback` stands in for a title with no Latin letters. */
export function uniqueSlug(db: Pick<Database, 'all'>, name: CollectionName, text: unknown, fallback = 'item'): string {
  const base = toSlug(text) || fallback;
  const taken = new Set(db.all(name).map((d) => d.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}
