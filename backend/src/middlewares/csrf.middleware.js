import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

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

// The browser-only live demo's payments service, which its storefront (DEMO_PAYMENTS_ORIGINS) calls. It uses no cookie.
const DEMO_PAYMENTS = /^\/v1\/demo-payments\//;

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
    if (TRUSTED_ORIGINS.has(origin)) return next();
    if (DEMO_PAYMENTS.test(req.path) && env.demoPayments.origins.includes(origin)) return next();
    // A fresh deploy whose CLIENT_URL / ADMIN_URL still name another address lands here on every sign-in; the function log
    // says which address was refused and which are trusted, so the fix is a variable, not a hunt.
    logger.warn(
      `Refused ${req.method} ${req.originalUrl} from origin ${origin}; trusted origins: ${[...TRUSTED_ORIGINS].join(', ')}. ` +
        'Set CLIENT_URL / ADMIN_URL to the addresses the shop and the admin are served from.'
    );
    return next(ApiError.forbidden('This request did not come from the store or its admin panel'));
  }
  if (req.get('sec-fetch-site') === 'cross-site') {
    return next(ApiError.forbidden('This request did not come from the store or its admin panel'));
  }
  next();
}
