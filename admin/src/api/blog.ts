import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiCreate, apiGet, apiList, apiRemove, apiUpdate } from '@/lib/apiClient';
import type { BlogInput, BlogPost, BlogStatus } from '@/types/blog';

export interface BlogFilters {
  status?: BlogStatus;
  q?: string;
  page?: number;
  limit?: number;
}

const KEY = ['blog'];

export function useBlogPosts(filters: BlogFilters) {
  return useQuery({
    queryKey: [...KEY, 'list', filters],
    queryFn: () => apiList<BlogPost>('/blog/manage', filters as Record<string, unknown>),
  });
}

export function useBlogPost(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => apiGet<BlogPost>(`/blog/manage/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BlogInput) => apiCreate<BlogPost>('/blog', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<BlogInput> }) =>
      apiUpdate<BlogPost>(`/blog/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

/** Publish or unpublish a post from the list, without opening the editor. */
export function useSetBlogPublished() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      apiCreate<BlogPost>(`/blog/${id}/${published ? 'publish' : 'unpublish'}`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRemove(`/blog/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
