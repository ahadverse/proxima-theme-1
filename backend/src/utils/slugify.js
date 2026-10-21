import slugifyLib from 'slugify';

export function toSlug(text) {
  return slugifyLib(text, { lower: true, strict: true, trim: true });
}

/**
 * Appends a short random suffix to guarantee uniqueness without a DB round trip
 * when a base slug collides (caller may still retry on a unique-index conflict).
 */
export function toUniqueSlug(text) {
  const base = toSlug(text);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

/**
 * Builds a slug from `text` that no document in `Model` uses yet, by counting up (-2, -3, ...) on
 * a collision — for content people title by hand, where two posts can easily share a headline.
 * `strict` slugify drops every non-Latin character, so a title written purely in Bangla yields an
 * empty slug; `fallback` stands in for it. The unique index still backstops a concurrent insert.
 */
export async function uniqueSlug(Model, text, fallback = 'item') {
  const base = toSlug(text) || fallback;
  let slug = base;
  for (let n = 2; await Model.exists({ slug }); n++) slug = `${base}-${n}`;
  return slug;
}

/** Escapes user input for safe use inside a RegExp (search boxes). */
export function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
