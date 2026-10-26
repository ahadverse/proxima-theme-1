import type { MetadataRoute } from 'next';
import { apiGet, apiGetResult } from '@/lib/api';
import { getBlogPosts } from '@/lib/blog';
import { SITE_URL } from '@/lib/site';
import { IS_DEMO } from '@/demo/config';

interface Entry {
  slug: string;
  updatedAt?: string;
  /** Products the admin hid from search engines. */
  seo?: { noIndex?: boolean };
}

/** Every entry of a paged list endpoint (the API serves at most 100 a page). Null if the API can't be reached. */
async function fetchAllPages(path: string): Promise<Entry[] | null> {
  const all: Entry[] = [];
  for (let page = 1; page <= 100; page++) {
    const { data, meta } = await apiGetResult<Entry[]>(`${path}${path.includes('?') ? '&' : '?'}limit=100&page=${page}`, {
      revalidate: 3600,
    });
    if (!data) return page === 1 ? null : all;
    all.push(...data);
    if (!meta || page >= Number(meta.pages)) break;
  }
  return all;
}

const lastModified = (entry: Entry) => (entry.updatedAt ? new Date(entry.updatedAt) : undefined);

// What the sitemap lists is what's really in the store. If the API can't be reached the product,
// category and brand pages are left out — the demo catalogue's URLs don't exist on a live store.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // The demo isn't indexed (robots.ts), and its server has no catalogue to list.
  if (IS_DEMO) return [];
  const staticRoutes = [
    '',
    '/products',
    '/deals',
    '/new-arrivals',
    '/brands',
    '/blog',
    '/faq',
    '/about',
    '/contact',
    '/store-locations',
    '/return-exchange',
    '/warranty-shipping',
    '/privacy-policy',
    '/terms-conditions',
  ].map((path) => ({ url: `${SITE_URL}${path}` }));

  const [products, categories, brands, posts] = await Promise.all([
    fetchAllPages('/products'),
    apiGet<Entry[]>('/categories?all=true', { revalidate: 3600 }),
    apiGet<Entry[]>('/brands', { revalidate: 3600 }),
    getBlogPosts(),
  ]);

  return [
    ...staticRoutes,
    ...(categories ?? []).map((c) => ({ url: `${SITE_URL}/category/${c.slug}`, lastModified: lastModified(c) })),
    ...(brands ?? []).map((b) => ({ url: `${SITE_URL}/brand/${b.slug}`, lastModified: lastModified(b) })),
    ...(products ?? [])
      .filter((p) => !p.seo?.noIndex)
      .map((p) => ({ url: `${SITE_URL}/product/${p.slug}`, lastModified: lastModified(p) })),
    ...posts.map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: new Date(p.publishedAt) })),
  ];
}
