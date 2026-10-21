import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// A saved change must never wait on, or fail because of, the storefront.
const TIMEOUT_MS = 3000;

/**
 * The storefront caches what it reads from the API so it does not ask on every page: the public settings
 * (theme colours, store name, footer menu…) under the tag "settings", and admin-written pages under "pages".
 * A change saved in the admin would then only show once that cache runs out, and the first reload after that
 * still shows the old value. This tells the storefront to drop those copies now, so the very next page load
 * has the change. Best effort: if the storefront can't be reached it catches up by itself within its cache window.
 */
export async function refreshStorefront(tags = ['settings']) {
  if (!env.revalidateSecret) return;

  try {
    const res = await fetch(`${env.clientUrl.replace(/\/+$/, '')}/api/revalidate`, {
      method: 'POST',
      headers: { 'x-revalidate-secret': env.revalidateSecret, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) logger.warn(`Storefront refresh was refused (HTTP ${res.status}) — is REVALIDATE_SECRET the same on both sides?`);
  } catch (err) {
    logger.warn('Storefront refresh failed:', err.message);
  }
}
