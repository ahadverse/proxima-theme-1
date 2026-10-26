import { IS_DEMO } from '@/demo/config';
import { demoRequest } from '@/demo/client/hub';

const CONFIGURED_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

// *.vercel.app is on the Public Suffix List: every project there is its own "site", so an API on one *.vercel.app name
// setting a cookie for a page on another is a third-party cookie, and Chrome (Incognito, "block third-party cookies"),
// Safari, Firefox and Brave drop it — customers would sign in and be signed straight out, and the guest cart and the
// analytics visitor id would never stick. A browser on such a host calls the storefront's own /api/v1 instead
// (next.config.ts forwards it to the API), which makes the cookie first-party. The server keeps the real address.
const SHARED_SUFFIX = '.vercel.app';

function resolveApiUrl(): string {
  if (typeof window === 'undefined') return CONFIGURED_API_URL;
  try {
    const here = window.location.hostname;
    const target = new URL(CONFIGURED_API_URL, window.location.origin);
    if (target.hostname !== here && here.endsWith(SHARED_SUFFIX) && target.hostname.endsWith(SHARED_SUFFIX)) {
      return target.pathname.replace(/\/+$/, '');
    }
  } catch {
    // Not a parseable address — use it exactly as written.
  }
  return CONFIGURED_API_URL;
}

const API_URL = resolveApiUrl();

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * The storefront's server renders pages for every visitor from a single address, so the API would count all of them as one
 * visitor and start refusing page data after a few hundred uncached views. Its reads carry the secret it shares with the
 * API (REVALIDATE_SECRET) so the API can tell it apart and give it a limit of its own.
 *
 * Server-only: the secret has no NEXT_PUBLIC_ prefix, so it does not exist in the browser's JavaScript, and nothing is
 * added when this runs in a browser.
 */
function serverHeaders(): Record<string, string> {
  if (typeof window !== 'undefined') return {};
  const secret = process.env.REVALIDATE_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev_insecure_revalidate_secret');
  return secret ? { 'x-storefront-key': secret } : {};
}

interface FetchOptions extends RequestInit {
  revalidate?: number | false;
  tags?: string[];
}

/**
 * fetch() for an API path. In the demo build the API is the visitor's own copy of the shop in their browser (src/demo), so
 * the call is answered there — and on the demo's server there is nothing to ask at all (its pages never get this far).
 */
async function apiFetch(path: string, init: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } }) {
  if (!IS_DEMO) return fetch(`${API_URL}${path}`, init);
  if (typeof window === 'undefined') throw new Error('The demo has no server-side data');
  const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
  const reply = await demoRequest(init.method ?? 'GET', path, body);
  return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { 'Content-Type': 'application/json' } });
}

/**
 * Every cached read that doesn't name its own tag (the public settings and the admin-written pages do) is the shop's
 * catalogue: products, brands, categories, banners, blog, FAQ. The API calls /api/revalidate with this tag after an admin
 * saves any of them, so a change shows on the next page load instead of when the time-based copy runs out.
 */
const CATALOG_TAG = 'catalog';

/**
 * Server/client-safe fetch against the Maroon API. Returns `null` on any failure
 * (network error, non-2xx, backend not reachable yet) instead of throwing, so callers
 * can fall back to placeholder content — the storefront must never hard-crash just
 * because a particular endpoint isn't built/configured yet.
 */
export async function apiGet<T>(path: string, options: FetchOptions = {}): Promise<T | null> {
  try {
    const { revalidate, tags, ...init } = options;
    const res = await apiFetch(path, {
      ...init,
      credentials: 'include',
      headers: { ...serverHeaders(), ...(init.headers as Record<string, string> | undefined) },
      next: revalidate !== undefined || tags ? { revalidate, tags: tags ?? [CATALOG_TAG] } : undefined,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as ApiEnvelope<T>;
    return json.data;
  } catch {
    return null;
  }
}

/**
 * Like apiGet, but keeps the HTTP status so a caller can tell "the server says this doesn't exist"
 * (404 — show Not Found) from "the server couldn't be reached" (0, or a 5xx — fall back to
 * placeholder content). `data` is null for anything other than a 2xx; `meta` carries paging info
 * (total / page / pages) for list endpoints.
 */
export async function apiGetResult<T>(
  path: string,
  options: FetchOptions = {}
): Promise<{ status: number; data: T | null; meta: Record<string, unknown> | null }> {
  try {
    const { revalidate, tags, ...init } = options;
    const res = await apiFetch(path, {
      ...init,
      credentials: 'include',
      headers: { ...serverHeaders(), ...(init.headers as Record<string, string> | undefined) },
      next: revalidate !== undefined || tags ? { revalidate, tags: tags ?? [CATALOG_TAG] } : undefined,
    });
    if (!res.ok) return { status: res.status, data: null, meta: null };
    const json = (await res.json()) as ApiEnvelope<T>;
    return { status: res.status, data: json.data, meta: json.meta ?? null };
  } catch {
    return { status: 0, data: null, meta: null };
  }
}

export async function apiMutate<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown
): Promise<{ ok: boolean; data: T | null; message: string }> {
  try {
    const res = await apiFetch(path, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json()) as ApiEnvelope<T>;
    return { ok: res.ok, data: json.data ?? null, message: json.message };
  } catch {
    return { ok: false, data: null, message: 'Network error — please try again' };
  }
}

export { API_URL };
