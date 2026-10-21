import { cache } from 'react';
import type { Metadata } from 'next';
import { apiGetResult } from '@/lib/api';
import type { CmsPageData } from '@/types/content';

/** An admin-edited page by slug. Cached per request so a page and its generateMetadata share one fetch. */
export const getCmsPage = cache((slug: string) =>
  apiGetResult<CmsPageData>(`/pages/${encodeURIComponent(slug)}`, { revalidate: 60, tags: ['pages'] })
);

/** Page <title> from the admin-edited title, or `fallbackTitle` if the page can't be loaded. */
export async function cmsPageMetadata(slug: string, fallbackTitle?: string): Promise<Metadata> {
  const { data } = await getCmsPage(slug);
  const title = data?.title ?? fallbackTitle;
  return title ? { title } : {};
}
