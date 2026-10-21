import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiList, apiRemove, apiUpdate } from '@/lib/apiClient';
import type { Review } from '@/types/review';

export interface ReviewFilters {
  isApproved?: 'true' | 'false';
  page?: number;
  limit?: number;
}

const KEY = ['reviews'];

export function useReviewsAdmin(filters: ReviewFilters) {
  return useQuery({
    queryKey: [...KEY, filters],
    queryFn: () => apiList<Review>('/reviews', filters as Record<string, unknown>),
  });
}

export function useApproveReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiUpdate<Review>(`/reviews/${id}/approve`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRemove(`/reviews/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
