import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
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
