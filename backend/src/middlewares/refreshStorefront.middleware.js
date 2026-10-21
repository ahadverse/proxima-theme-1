import { refreshStorefront } from '../services/storefront.service.js';

const WRITES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * For the routers whose writes change what shoppers see — products and their stock, brands, categories, attributes,
 * banners, blog posts, FAQs, review moderation. The storefront keeps a cached copy of all of that ("catalog") so it
 * doesn't ask the API on every page; without this, a rename or price change would only show once the copy runs out
 * (minutes later). After a write succeeds, the reply is held for the moment it takes to tell the storefront to drop
 * the copy, so the very next page load has the change. Reads and refused writes (4xx / 5xx) change nothing.
 *
 * refreshStorefront never throws and gives up after a few seconds, so a storefront that is down or misconfigured can
 * neither fail nor noticeably slow a save.
 */
export function refreshCatalogOnWrite(req, res, next) {
  if (!WRITES.has(req.method)) return next();

  const send = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 400) return send(body);
    void refreshStorefront(['catalog']).then(() => send(body));
    return res;
  };
  next();
}
