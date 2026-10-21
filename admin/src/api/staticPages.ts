import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiCreate, apiGet, apiRemove, apiUpdate } from '@/lib/apiClient';
import type { StaticPage, StaticPageInput } from '@/types/page';

const KEY = ['static-pages'];

/**
 * Renaming a page's address or deleting a page also rewrites the footer menu on the server, so the Settings
 * copy held here is out of date after any page save — without this, the Footer tab could save a link to a
 * page that no longer exists back into the menu.
 */
function refreshPagesAndFooter(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['settings'] });
  return queryClient.invalidateQueries({ queryKey: KEY });
}

export function useStaticPages() {
  return useQuery({
    queryKey: [...KEY, 'list'],
    queryFn: () => apiGet<StaticPage[]>('/pages/manage'),
  });
}

export function useStaticPage(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => apiGet<StaticPage>(`/pages/manage/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateStaticPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StaticPageInput) => apiCreate<StaticPage>('/pages', input),
    onSuccess: () => refreshPagesAndFooter(queryClient),
  });
}

export function useUpdateStaticPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<StaticPageInput> }) =>
      apiUpdate<StaticPage>(`/pages/${id}`, input),
    onSuccess: () => refreshPagesAndFooter(queryClient),
  });
}

export function useDeleteStaticPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRemove(`/pages/${id}`),
    onSuccess: () => refreshPagesAndFooter(queryClient),
  });
}
