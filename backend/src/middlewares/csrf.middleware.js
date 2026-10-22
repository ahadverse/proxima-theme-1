import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const originOf = (url) => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

// The only websites allowed to make the browser send a state-changing request: the storefront and the admin panel.
const TRUSTED_ORIGINS = new Set([env.clientUrl, env.adminUrl].map(originOf).filter(Boolean));

// Payment gateways call these themselves (their servers, or the shopper's browser sent back from their page), and the
// calls carry no login cookie — they are verified with the gateway instead.
const GATEWAY_CALLBACKS = /^\/v1\/payments\//;

/**
 * The login cookies are SameSite=None in production (the storefront, the admin and the API are normally on different
 * sites), so a browser attaches them to a form that any other website posts to this API. Every browser labels such a
 * request with the page it came from, so a state-changing request from anywhere but the storefront or the admin is refused.
 *
 * A request with no Origin and no cross-site Fetch Metadata (curl, a server, a gateway's IPN) is not a browser acting on
 * a victim's behalf, so it carries none of the victim's cookies and is let through.
 *
 * Mounted on `/api`, so `req.path` starts with `/v1/…`.
 */
export function requireTrustedOrigin(req, res, next) {
  if (SAFE_METHODS.has(req.method) || GATEWAY_CALLBACKS.test(req.path)) return next();

  const origin = req.get('origin');
  if (origin) {
    return TRUSTED_ORIGINS.has(origin) ? next() : next(ApiError.forbidden('This request did not come from the store or its admin panel'));
  }
  if (req.get('sec-fetch-site') === 'cross-site') {
    return next(ApiError.forbidden('This request did not come from the store or its admin panel'));
  }
  next();
}
