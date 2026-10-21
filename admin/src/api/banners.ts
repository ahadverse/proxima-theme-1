import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiCreate, apiGet, apiRemove, apiUpdate } from '@/lib/apiClient';
import type { Banner, BannerInput, BannerType } from '@/types/banner';

export interface BannerFilters {
  type?: BannerType;
  status?: 'active' | 'inactive';
}

const KEY = ['banners'];

export function useBanners(filters: BannerFilters) {
  return useQuery({
    queryKey: [...KEY, filters],
    queryFn: () => apiGet<Banner[]>('/banners/manage', filters as Record<string, unknown>),
  });
}

export function useCreateBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BannerInput) => apiCreate<Banner>('/banners', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<BannerInput> }) =>
      apiUpdate<Banner>(`/banners/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRemove(`/banners/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
