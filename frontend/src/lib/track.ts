import { API_URL } from '@/lib/api';

/**
 * First-party analytics: product views and add-to-carts, reported to the store's own backend
 * (POST /analytics/track) so the admin's Analytics page can show them. Purchases aren't reported
 * from here — the server records those itself when an order is placed.
 *
 * Fire-and-forget: tracking must never slow down or break shopping, so failures are swallowed.
 * The backend identifies the visitor with its own httpOnly cookie, hence `credentials: 'include'`.
 */

// Only real catalogue products can be tracked. The demo products shown when the API is down have
// slug-style ids, which the backend would reject anyway — skip the pointless request.
const OBJECT_ID = /^[a-f0-9]{24}$/i;

// Same window the backend uses to ignore a visitor re-viewing the same product.
const VIEW_WINDOW_MS = 30 * 60 * 1000;

function send(body: Record<string, unknown>) {
  if (typeof body.product !== 'string' || !OBJECT_ID.test(body.product)) return;

  fetch(`${API_URL}/analytics/track`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {});
}

/**
 * Whether this tab has already reported a view of the product recently — and if not, remembers
 * that it has. This matters beyond saving requests: a first-time visitor has no session cookie yet,
 * so two views fired at once (React's dev double-effect, a quick double navigation) would each be
 * issued their own cookie and count as two different visitors.
 */
function viewedRecently(productId: string): boolean {
  try {
    const key = `maroon-viewed:${productId}`;
    const last = Number(sessionStorage.getItem(key));
    if (last && Date.now() - last < VIEW_WINDOW_MS) return true;
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // Storage blocked: fall through and let the server's own de-duplication handle repeats.
  }
  return false;
}

export function trackProductView(productId: string) {
  if (viewedRecently(productId)) return;
  send({ type: 'view', product: productId });
}

export function trackAddToCart(productId: string, quantity = 1, variantSku?: string | null) {
  send({ type: 'add_to_cart', product: productId, quantity, variantSku: variantSku ?? null });
}
