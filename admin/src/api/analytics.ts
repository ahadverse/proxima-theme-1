import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/apiClient';
import type {
  AnalyticsOverview,
  CategoryBreakdown,
  Funnel,
  ProductPerformance,
} from '@/types/analytics';

// Switching the date range keeps the previous numbers on screen (dimmed) until the new ones arrive,
// instead of flashing skeletons — `isPlaceholderData` tells the page when that's the case.
const rangeQuery = { placeholderData: keepPreviousData, staleTime: 60_000 };

export function useAnalyticsOverview(days: number) {
  return useQuery({
    queryKey: ['analytics', 'overview', days],
    queryFn: () => apiGet<AnalyticsOverview>('/analytics/overview', { days }),
    ...rangeQuery,
  });
}

export function useProductPerformance(days: number, limit = 8) {
  return useQuery({
    queryKey: ['analytics', 'products', days, limit],
    queryFn: () => apiGet<ProductPerformance>('/analytics/products', { days, limit }),
    ...rangeQuery,
  });
}

export function useCategoryBreakdown(days: number) {
  return useQuery({
    queryKey: ['analytics', 'categories', days],
    queryFn: () => apiGet<CategoryBreakdown>('/analytics/categories', { days }),
    ...rangeQuery,
  });
}

export function useFunnel(days: number) {
  return useQuery({
    queryKey: ['analytics', 'funnel', days],
    queryFn: () => apiGet<Funnel>('/analytics/funnel', { days }),
    ...rangeQuery,
  });
}
