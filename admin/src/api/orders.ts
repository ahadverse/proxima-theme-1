import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiList, apiUpdate } from '@/lib/apiClient';
import type { Order, OrderStatus, PaymentStatus } from '@/types/order';

export interface OrderListFilters {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  q?: string;
  page?: number;
  limit?: number;
}

export function useOrdersAdmin(filters: OrderListFilters) {
  return useQuery({
    queryKey: ['orders', 'admin', filters],
    queryFn: () => apiList<Order>('/orders/admin', filters as Record<string, unknown>),
  });
}

export function useRecentOrders(limit = 5) {
  return useQuery({
    queryKey: ['orders', 'recent', limit],
    queryFn: () => apiList<Order>('/orders/admin', { limit }).then((r) => r.items),
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => apiGet<Order>(`/orders/admin/${id}`),
    enabled: Boolean(id),
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: OrderStatus; note?: string }) =>
      apiUpdate<Order>(`/orders/admin/${id}/status`, { status, note }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useUpdateOrderPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      paymentStatus,
      transactionId,
    }: {
      id: string;
      paymentStatus: PaymentStatus;
      transactionId?: string;
    }) => apiUpdate<Order>(`/orders/admin/${id}/payment`, { paymentStatus, transactionId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
}
