/** The storefront's public address — what absolute URLs (canonical links, sitemap, social previews) are built on. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
