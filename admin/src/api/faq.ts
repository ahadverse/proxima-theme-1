import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiCreate, apiGet, apiRemove, apiUpdate } from '@/lib/apiClient';
import type { Faq, FaqInput } from '@/types/faq';

const KEY = ['faq'];

export function useFaqs() {
  return useQuery({
    queryKey: KEY,
    // The public GET /faq hides inactive questions — admin needs to see and re-activate them.
    queryFn: () => apiGet<Faq[]>('/faq/manage'),
  });
}

export function useCreateFaq() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FaqInput) => apiCreate<Faq>('/faq', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateFaq() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<FaqInput> }) =>
      apiUpdate<Faq>(`/faq/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteFaq() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRemove(`/faq/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
