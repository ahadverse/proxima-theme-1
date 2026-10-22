import { createHash, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

/** The header the storefront's own server sends on its API reads. */
export const STOREFRONT_KEY_HEADER = 'x-storefront-key';

const digest = (value) => createHash('sha256').update(value).digest();

/**
 * True for a request from the storefront's server, which proves itself with the secret it already shares with this API
 * (REVALIDATE_SECRET). That server renders pages for every visitor from one address, so counting its reads against the
 * per-address limit meant a few hundred uncached page views were enough to shut every visitor out; it gets its own,
 * much higher cap instead (see app.js). Without the secret configured nothing is trusted and every caller is limited alike.
 */
export function isStorefrontServer(req) {
  if (!env.revalidateSecret) return false;
  const given = req.get(STOREFRONT_KEY_HEADER);
  // Hashed first so the comparison is constant-time whatever length was sent.
  return Boolean(given) && timingSafeEqual(digest(given), digest(env.revalidateSecret));
}
