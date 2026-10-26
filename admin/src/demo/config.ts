/**
 * The live sales demo is a separate build of the admin (VITE_DEMO_MODE=true). In it every API call is answered by the demo
 * storefront's data hub — the visitor's own copy of the shop, kept in their browser on the store's domain — instead of the
 * server. A normal build has this flag off, and the demo code behind it is left out. See docs/DEMO_MODE_PLAN.md.
 */
export const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

/** The demo storefront's data hub page, which this admin frames (or opens as a small window, see hub.ts). */
export const DEMO_HUB_URL = import.meta.env.VITE_DEMO_HUB_URL || 'http://localhost:3000/demo-hub/index.html';

/** The demo storefront — the "Open store" button, and where the checklist's store steps lead. */
export const DEMO_STORE_URL = (import.meta.env.VITE_DEMO_STORE_URL || DEMO_HUB_URL.replace(/^(https?:\/\/[^/]+).*$/, '$1')).replace(
  /\/+$/,
  ''
);

/** Where the demo's "Get this store" buttons lead (the sales page, or a WhatsApp chat). Empty = no button. */
export const DEMO_CTA_URL = import.meta.env.VITE_DEMO_CTA_URL ?? '';
export const DEMO_CTA_LABEL = import.meta.env.VITE_DEMO_CTA_LABEL || 'Get this store';
