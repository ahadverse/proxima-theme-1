import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiCreate, apiGet, apiRemove, apiUpdate } from '@/lib/apiClient';
import type { Category, CategoryInput } from '@/types/category';

const KEY = ['categories'];

export function useCategories() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiGet<Category[]>('/categories', { all: true }),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryInput) => apiCreate<Category>('/categories', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CategoryInput }) =>
      apiUpdate<Category>(`/categories/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

/** Saves a new order for one set of siblings (the top-level categories, or one category's subcategories). */
export function useReorderCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, parent }: { ids: string[]; parent: string | null }) =>
      apiUpdate<unknown>('/categories/reorder', { ids, parent }),
    // The list moves the moment it is dropped; if the save fails it goes back.
    onMutate: async ({ ids }) => {
      await queryClient.cancelQueries({ queryKey: KEY });
      const previous = queryClient.getQueryData<Category[]>(KEY);
      queryClient.setQueryData<Category[]>(KEY, (old) =>
        old?.map((c) => (ids.includes(c._id) ? { ...c, sortOrder: ids.indexOf(c._id) } : c))
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(KEY, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRemove(`/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
