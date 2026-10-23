import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1',
  withCredentials: true,
});

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
