import { useQuery } from '@tanstack/react-query';
import { apiGet, apiList } from '@/lib/apiClient';
import type { Customer, CustomerDetail } from '@/types/customer';

export interface CustomerFilters {
  q?: string;
  page?: number;
  limit?: number;
}

export function useCustomers(filters: CustomerFilters) {
  return useQuery({
    queryKey: ['customers', filters],
    queryFn: () => apiList<Customer>('/customers', filters as Record<string, unknown>),
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: () => apiGet<CustomerDetail>(`/customers/${id}`),
    enabled: Boolean(id),
  });
}
