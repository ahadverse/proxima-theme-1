import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/apiClient';
import type { DashboardSummary } from '@/types/dashboard';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => apiGet<DashboardSummary>('/dashboard'),
  });
}
