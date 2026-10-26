/**
 * The live sales demo is a separate build of the storefront (NEXT_PUBLIC_DEMO_MODE=true). In it the shop's data lives in the
 * visitor's own browser — a copy of the sample shop, shared with the demo admin — instead of on our server. A normal build
 * has this flag off, and every `if (IS_DEMO)` branch (and the demo code behind it) is left out of it.
 *
 * See docs/DEMO_MODE_PLAN.md.
 */
export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

/**
 * True while the demo build renders on the server. The server has none of the visitor's data, so every page that loads
 * data hands over to the browser (DemoPage), which runs the very same page there against the local copy.
 */
export const DEMO_ON_SERVER = IS_DEMO && typeof window === 'undefined';

/**
 * The demo admin's address — the one other site allowed to use this shop's data (it frames the data hub). In development it
 * is the admin's usual port. In a production build it has to be set (NEXT_PUBLIC_DEMO_ADMIN_URL); left out, the demo is the
 * storefront alone: no admin link, no "Try it" checklist (four of its five steps are done in the admin), and the data hub
 * lets no other site in.
 */
export const DEMO_ADMIN_URL = (process.env.NEXT_PUBLIC_DEMO_ADMIN_URL ?? (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173'))
  .split(',')[0]
  .trim()
  .replace(/\/+$/, '');
export const HAS_DEMO_ADMIN = DEMO_ADMIN_URL !== '';

/**
 * The real API's small demo-payments service (docs/DEMO_MODE_PLAN.md §4.7), which starts sandbox payments for orders
 * that only exist in the visitor's browser. Empty = every online payment uses the simulated payment screens.
 */
export const DEMO_PAYMENTS_API = (process.env.NEXT_PUBLIC_DEMO_PAYMENTS_API ?? '').replace(/\/+$/, '');

/** Where the demo's "Get this store" buttons lead (the sales page, or a WhatsApp chat). Empty = no button. */
export const DEMO_CTA_URL = process.env.NEXT_PUBLIC_DEMO_CTA_URL ?? '';
export const DEMO_CTA_LABEL = process.env.NEXT_PUBLIC_DEMO_CTA_LABEL || 'Get this store';
