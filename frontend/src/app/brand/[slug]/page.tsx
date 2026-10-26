import type { Metadata } from 'next';
import { parsePage, parseSort } from '@/lib/listing';
import { DEMO_ON_SERVER } from '@/demo/config';
import { DemoPage } from '@/demo/DemoPage';
import BrandPage, { getBrand } from './BrandPage';

// Backed by live catalog data with no static params list — render per request.
export const instant = false;

export async function generateMetadata({ params, searchParams }: PageProps<'/brand/[slug]'>): Promise<Metadata> {
  if (DEMO_ON_SERVER) return {};
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const brand = await getBrand(slug);
  const name = brand?.name ?? slug;
  const page = parsePage(sp.page);
  return {
    title: page > 1 ? `${name} — Page ${page}` : name,
    description: `Shop ${name} products at Maroon — genuine products, fast delivery, best prices in Bangladesh.`,
    alternates: { canonical: `/brand/${slug}` },
    robots: parseSort(sp.sort) ? { index: false, follow: true } : undefined,
  };
}

export default function Page(props: PageProps<'/brand/[slug]'>) {
  return DEMO_ON_SERVER ? <DemoPage route="brand" /> : <BrandPage {...props} />;
}
