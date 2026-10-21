import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiUpdate } from '@/lib/apiClient';
import type { AdminSettings, PublicSettings, SettingsPatch } from '@/types/settings';

const ADMIN_KEY = ['settings', 'admin'];
const PUBLIC_KEY = ['settings', 'public'];

/**
 * The public store settings — in particular `theme`, which App.tsx applies to the admin so a
 * colour change made for the storefront repaints the admin too. Refetches when the tab regains
 * focus and on the header's refresh button, so a theme saved elsewhere shows up quickly.
 *
 * useUpdateSettings invalidates this after every save, so a theme saved from the Settings page
 * applies to this admin session immediately rather than on the next refetch.
 */
export function usePublicSettings() {
  return useQuery({
    queryKey: PUBLIC_KEY,
    queryFn: () => apiGet<PublicSettings>('/settings/public'),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

/** Full settings for the Settings page (super-admin only). Secret fields arrive masked. */
export function useAdminSettings() {
  return useQuery({
    queryKey: ADMIN_KEY,
    queryFn: () => apiGet<AdminSettings>('/settings'),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: SettingsPatch) => apiUpdate<AdminSettings>('/settings', patch),
    onSuccess: (settings) => {
      queryClient.setQueryData(ADMIN_KEY, settings);
      // Repaints the admin (App.tsx applies the theme) and refreshes anything else reading it.
      void queryClient.invalidateQueries({ queryKey: PUBLIC_KEY });
    },
  });
}
