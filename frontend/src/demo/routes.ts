import type { PageModule } from './pageRunner';

/**
 * Every storefront page that loads data on the server. In the demo build each one's page.tsx returns <DemoPage route="…" />
 * on the server, and the browser loads the page's content module from here (the file page.tsx renders in a normal build)
 * and runs it against the visitor's local copy of the shop. A new data-loading page needs its entry here.
 */
export const demoRoutes = {
  home: () => import('@/app/HomePage'),
  product: () => import('@/app/product/[slug]/ProductPage'),
  category: () => import('@/app/category/[slug]/CategoryPage'),
  brand: () => import('@/app/brand/[slug]/BrandPage'),
  brands: () => import('@/app/brands/BrandsPage'),
  products: () => import('@/app/products/ProductsPage'),
  deals: () => import('@/app/deals/DealsPage'),
  newArrivals: () => import('@/app/new-arrivals/NewArrivalsPage'),
  faq: () => import('@/app/faq/FaqPage'),
  contact: () => import('@/app/contact/ContactPage'),
  storeLocations: () => import('@/app/store-locations/StoreLocationsPage'),
  checkout: () => import('@/app/checkout/CheckoutPage'),
  blog: () => import('@/app/blog/BlogListPage'),
  blogPost: () => import('@/app/blog/[slug]/BlogPostPage'),
  customPage: () => import('@/app/pages/[slug]/CustomPage'),
  about: () => import('@/app/about/AboutPage'),
  privacyPolicy: () => import('@/app/privacy-policy/PrivacyPolicyPage'),
  returnExchange: () => import('@/app/return-exchange/ReturnExchangePage'),
  termsConditions: () => import('@/app/terms-conditions/TermsConditionsPage'),
  warrantyShipping: () => import('@/app/warranty-shipping/WarrantyShippingPage'),
} satisfies Record<string, () => Promise<unknown>>;

export type DemoRouteName = keyof typeof demoRoutes;

export async function loadRouteModule(route: DemoRouteName): Promise<PageModule> {
  return (await demoRoutes[route]()) as unknown as PageModule;
}
