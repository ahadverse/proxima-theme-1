import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiCreate, apiList, apiRemove, apiUpdate } from '@/lib/apiClient';
import type { Coupon, CouponInput } from '@/types/coupon';

export interface CouponFilters {
  status?: 'active' | 'inactive';
  q?: string;
  page?: number;
  limit?: number;
}

const KEY = ['coupons'];

export function useCoupons(filters: CouponFilters) {
  return useQuery({
    queryKey: [...KEY, filters],
    queryFn: () => apiList<Coupon>('/coupons', filters as Record<string, unknown>),
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CouponInput) => apiCreate<Coupon>('/coupons', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CouponInput> }) =>
      apiUpdate<Coupon>(`/coupons/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRemove(`/coupons/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
