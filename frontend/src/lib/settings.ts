import { cache } from 'react';
import { apiGet } from '@/lib/api';
import { DEFAULT_SETTINGS, type PublicSettings } from '@/types/settings';

/**
 * The store's public settings (name, logo, contact details, theme, SEO). Fetched once per request
 * however many components ask, and the defaults stand in only while the API can't be reached.
 * Cached for a minute, but tagged "settings" so a save in the admin expires it at once
 * (the API calls app/api/revalidate after every Settings update).
 */
export const getPublicSettings = cache(async (): Promise<PublicSettings> => {
  const settings = await apiGet<PublicSettings>('/settings/public', { revalidate: 60, tags: ['settings'] });
  if (!settings) return DEFAULT_SETTINGS;
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    // An API that predates the editable footer sends none: show the original menu rather than an empty footer.
    footer: settings.footer ?? DEFAULT_SETTINGS.footer,
    // A blank SEO field in the admin means "use the default", not "publish an empty title".
    seo: {
      metaTitle: settings.seo?.metaTitle || DEFAULT_SETTINGS.seo.metaTitle,
      metaDescription: settings.seo?.metaDescription || DEFAULT_SETTINGS.seo.metaDescription,
    },
  };
});
