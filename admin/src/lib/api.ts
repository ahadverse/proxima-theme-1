import axios from 'axios';
import { IS_DEMO } from '@/demo/config';
import { demoAdapter } from '@/demo/adapter';

// *.vercel.app is on the Public Suffix List: every project there is its own "site", so an API on
// proxima-api.vercel.app setting a cookie for a page on proxima-admin.vercel.app is a third-party cookie, and Chrome
// (Incognito, "block third-party cookies", Tracking Protection), Safari, Firefox and Brave drop it — sign-in "works" and
// the next request is a 401. Pages on such a host call their own /api/* instead; vercel.json forwards that to the API,
// so the cookie is first-party. The same-origin path keeps whatever path VITE_API_URL had (/api/v1).
const SHARED_SUFFIX = '.vercel.app';

function resolveBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1';
  try {
    const here = window.location.hostname;
    const target = new URL(configured, window.location.origin);
    if (target.hostname !== here && here.endsWith(SHARED_SUFFIX) && target.hostname.endsWith(SHARED_SUFFIX)) {
      return target.pathname.replace(/\/+$/, '');
    }
  } catch {
    // Not a parseable address — use it exactly as written.
  }
  return configured;
}

export const api = axios.create({
  baseURL: resolveBaseUrl(),
  withCredentials: true,
  // The live demo's build answers every call from the visitor's own copy of the shop (src/demo).
  ...(IS_DEMO ? { baseURL: '/api/v1', adapter: demoAdapter } : {}),
});

/**
 * Sign-in was accepted but the browser did not keep the login cookie, so the very next request was refused. Raised right
 * at sign-in so the person sees why, instead of a dashboard that fills with "Admin login required" errors.
 */
export class SessionCookieError extends Error {
  constructor() {
    super(
      'Signed in, but your browser did not keep the login cookie. Turn off "block third-party cookies" for this site (or ' +
        'use a normal, non-private window) and try again.'
    );
    this.name = 'SessionCookieError';
  }
}

// A logged-out session (cookie expired/cleared) surfaces as a 401 on whatever call happens to run
// next, wherever it happens to be. Catch it in one place and flip the auth store so ProtectedRoute
// redirects to /login on its own, instead of every page handling a stray 401 itself.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ListMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export function apiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
    // The hosting platform turns away an oversized request itself, with a plain-text body the API never wrote.
    if (error.response?.status === 413) return 'That file is too large to upload — try a smaller image';
    return fallback;
  }
  return fallback;
}
