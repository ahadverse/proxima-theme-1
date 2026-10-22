const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

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
    const res = await fetch(`${API_URL}${path}`, {
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
    const res = await fetch(`${API_URL}${path}`, {
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
    const res = await fetch(`${API_URL}${path}`, {
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
