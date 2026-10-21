import { api, type ApiEnvelope, type ListMeta } from '@/lib/api';

/**
 * Thin typed wrappers over the shared axios `api` instance, for use as TanStack Query
 * queryFn/mutationFn. Unlike the storefront's never-throw apiGet/apiMutate, these throw on
 * failure — that's what Query needs to populate isError/error.
 */

export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await api.get<ApiEnvelope<T>>(url, { params });
  return res.data.data;
}

export async function apiList<T>(
  url: string,
  params?: Record<string, unknown>
): Promise<{ items: T[]; meta: ListMeta }> {
  const res = await api.get<ApiEnvelope<T[]>>(url, { params });
  return { items: res.data.data, meta: res.data.meta as unknown as ListMeta };
}

export async function apiCreate<T>(url: string, body: unknown): Promise<T> {
  const res = await api.post<ApiEnvelope<T>>(url, body);
  return res.data.data;
}

export async function apiUpdate<T>(url: string, body: unknown): Promise<T> {
  const res = await api.patch<ApiEnvelope<T>>(url, body);
  return res.data.data;
}

export async function apiRemove(url: string): Promise<void> {
  await api.delete(url);
}
