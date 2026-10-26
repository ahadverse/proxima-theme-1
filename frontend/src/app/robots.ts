import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { IS_DEMO } from '@/demo/config';

export default function robots(): MetadataRoute.Robots {
  // Every visitor's demo store is their own, and none of it is a real shop: nothing to index.
  if (IS_DEMO) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private or per-visitor pages, and the order pages (which carry an order number in the address).
        disallow: ['/account', '/checkout', '/cart', '/login', '/register', '/order-confirmation', '/track-order'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
