import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import { HAS_DEMO_ADMIN } from './config';

/**
 * What the demo build's server says about every page: it has none of the visitor's data, so not the page's own title (the
 * browser sets that once the page is drawn) — but a good link preview for WhatsApp and Messenger, and no indexing: every
 * visitor's demo store is different, and none of it is a real shop.
 */
export const demoMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Maroon — live demo store', template: '%s | Maroon demo' },
  description: HAS_DEMO_ADMIN
    ? 'Try a complete online store: shop the storefront, then run it from the admin panel — products, orders, payments, ' +
      'theme colours. Everything you change stays in your own browser.'
    : 'Try a complete online store: search, add to the cart and check out. Everything you do stays in your own browser.',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    siteName: 'Maroon demo',
    title: 'Maroon — a complete online store you can try',
    description: HAS_DEMO_ADMIN
      ? 'Shop the storefront, then run it from the admin panel. Everything you change stays in your browser.'
      : 'Search, add to the cart and check out. Everything you do stays in your browser.',
    images: [{ url: '/demo-hub/og.png', width: 1200, height: 630, alt: 'Maroon — live demo store' }],
  },
  twitter: { card: 'summary_large_image', images: ['/demo-hub/og.png'] },
};
