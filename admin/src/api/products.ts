import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiCreate, apiGet, apiList, apiRemove, apiUpdate } from '@/lib/apiClient';
import type { Product, ProductInput, ProductStatus } from '@/types/product';

export interface ProductListFilters {
  category?: string;
  brand?: string;
  q?: string;
  status?: ProductStatus;
  page?: number;
  limit?: number;
}

export function useProductsAdmin(filters: ProductListFilters) {
  return useQuery({
    queryKey: ['products', 'admin', filters],
    queryFn: () => apiList<Product>('/products/manage', filters as Record<string, unknown>),
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => apiGet<Product>(`/products/manage/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProductInput) => apiCreate<Product>('/products', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ProductInput> }) =>
      apiUpdate<Product>(`/products/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRemove(`/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      quantityChange,
      variantSku,
      note,
    }: {
      id: string;
      quantityChange: number;
      /** Which variant, for a variable product; a simple product has no variants. */
      variantSku?: string | null;
      note?: string;
    }) => apiUpdate<Product>(`/products/${id}/stock`, { quantityChange, variantSku, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
