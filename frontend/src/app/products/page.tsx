import type { Metadata } from 'next';
import { parsePage } from '@/lib/listing';
import { DEMO_ON_SERVER } from '@/demo/config';
import { DemoPage } from '@/demo/DemoPage';
import ProductsPage, { hasFilters, readFilters } from './ProductsPage';

// Reads filter/search query params per request — no static shell worth prerendering.
export const instant = false;

export async function generateMetadata({ searchParams }: PageProps<'/products'>): Promise<Metadata> {
  if (DEMO_ON_SERVER) return {};
  const sp = await searchParams;
  const filters = readFilters(sp);
  const page = parsePage(sp.page);

  const title = filters.q ? `Search: ${filters.q}` : page > 1 ? `All Products — Page ${page}` : 'All Products';
  return {
    title,
    description: 'Browse the full Maroon catalog of electronics, gadgets, and accessories.',
    // Searches and filter combinations are endless; only the plain catalogue is worth indexing.
    robots: hasFilters(filters) ? { index: false, follow: true } : undefined,
    alternates: { canonical: '/products' },
  };
}

export default function Page(props: PageProps<'/products'>) {
  return DEMO_ON_SERVER ? <DemoPage route="products" /> : <ProductsPage {...props} />;
}
