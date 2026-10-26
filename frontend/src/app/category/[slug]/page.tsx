import type { Metadata } from 'next';
import { parsePage, parseSort } from '@/lib/listing';
import { DEMO_ON_SERVER } from '@/demo/config';
import { DemoPage } from '@/demo/DemoPage';
import CategoryPage, { getCategory } from './CategoryPage';

// Backed by live catalog data with no static params list — render per request.
export const instant = false;

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<'/category/[slug]'>): Promise<Metadata> {
  if (DEMO_ON_SERVER) return {};
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const category = await getCategory(slug);
  const name = category?.name ?? slug;
  const page = parsePage(sp.page);
  return {
    title: page > 1 ? `${name} — Page ${page}` : name,
    description: `Shop ${name} at Maroon — genuine products, fast delivery, best prices in Bangladesh.`,
    alternates: { canonical: `/category/${slug}` },
    // A re-sorted listing shows the same products as the default one.
    robots: parseSort(sp.sort) ? { index: false, follow: true } : undefined,
  };
}

export default function Page(props: PageProps<'/category/[slug]'>) {
  return DEMO_ON_SERVER ? <DemoPage route="category" /> : <CategoryPage {...props} />;
}
