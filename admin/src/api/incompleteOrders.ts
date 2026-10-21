import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiList, apiUpdate } from '@/lib/apiClient';
import type { IncompleteOrder, IncompleteOrderStatus } from '@/types/incompleteOrder';

export interface IncompleteOrderFilters {
  status?: IncompleteOrderStatus;
  page?: number;
  limit?: number;
}

export function useIncompleteOrders(filters: IncompleteOrderFilters) {
  return useQuery({
    queryKey: ['incomplete-orders', filters],
    queryFn: () => apiList<IncompleteOrder>('/incomplete-orders', filters as Record<string, unknown>),
  });
}

export function useUpdateIncompleteOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: IncompleteOrderStatus }) =>
      apiUpdate<IncompleteOrder>(`/incomplete-orders/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incomplete-orders'] }),
  });
}
