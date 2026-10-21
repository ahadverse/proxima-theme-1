import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiCreate, apiGet, apiRemove, apiUpdate } from '@/lib/apiClient';
import type { Brand, BrandInput } from '@/types/brand';

const KEY = ['brands'];

export function useBrands() {
  return useQuery({
    queryKey: KEY,
    // Public GET /brands defaults to status:'active' only — admin needs inactive ones too.
    queryFn: () => apiGet<Brand[]>('/brands', { all: true }),
  });
}

/** Saves a new order for all the brands. */
export function useReorderBrands() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => apiUpdate<unknown>('/brands/reorder', { ids }),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: KEY });
      const previous = queryClient.getQueryData<Brand[]>(KEY);
      queryClient.setQueryData<Brand[]>(KEY, (old) =>
        old?.map((b) => (ids.includes(b._id) ? { ...b, sortOrder: ids.indexOf(b._id) } : b))
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(KEY, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BrandInput) => apiCreate<Brand>('/brands', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BrandInput }) =>
      apiUpdate<Brand>(`/brands/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRemove(`/brands/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
