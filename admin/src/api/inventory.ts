import { useQuery } from '@tanstack/react-query';
import { apiGet, apiList } from '@/lib/apiClient';
import type { InventoryLogEntry } from '@/types/inventory';
import type { Product } from '@/types/product';

export function useLowStockProducts() {
  return useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: () => apiGet<Product[]>('/inventory/low-stock'),
  });
}

/** Stock movements of one product (every variant of it), newest first. */
export function useInventoryLog(productId: string | undefined, page = 1) {
  return useQuery({
    queryKey: ['inventory', 'log', productId, page],
    queryFn: () => apiList<InventoryLogEntry>('/inventory', { product: productId, page }),
    enabled: Boolean(productId),
  });
}

/** Stock movements across the whole store, newest first. */
export function useRecentInventoryLog(page = 1) {
  return useQuery({
    queryKey: ['inventory', 'log', 'all', page],
    queryFn: () => apiList<InventoryLogEntry>('/inventory', { page, limit: 25 }),
  });
}
