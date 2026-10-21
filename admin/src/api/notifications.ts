import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/apiClient';
import type { NotificationItem } from '@/types/notification';

// Not real-time — but the global mutation cache (main.tsx) invalidates this on every
// successful action anywhere, and it also refetches on its own short interval, so it
// stays close to current without a websocket.
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiGet<NotificationItem[]>('/dashboard/notifications'),
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}
