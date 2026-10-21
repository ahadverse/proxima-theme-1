import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { SortSelect } from '@/components/filters/SortSelect';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductCard } from '@/components/product/ProductCard';
import { Pagination } from '@/components/ui/Pagination';
import { apiGetResult } from '@/lib/api';
import { loadProducts } from '@/lib/catalog';
import { parsePage, parseSort } from '@/lib/listing';
import { mapBrand } from '@/lib/mappers';
import { allPlaceholderProducts, brandStrip } from '@/lib/placeholder-data';
import type { BrandSummary } from '@/types/catalog';

// Backed by live catalog data with no static params list — render per request.
export const instant = false;

const PAGE_SIZE = 24;

/** The brand, or null if the store says there's no such brand. Demo brands only while the API is unreachable. */
async function getBrand(slug: string): Promise<BrandSummary | null> {
  const { status, data } = await apiGetResult<Parameters<typeof mapBrand>[0]>(
    `/brands/${encodeURIComponent(slug)}`,
    { revalidate: 300 }
  );
  if (data) return mapBrand(data);
  if (status === 404) return null;
  return brandStrip.find((b) => b.slug === slug) ?? null;
}

export async function generateMetadata({ params, searchParams }: PageProps<'/brand/[slug]'>): Promise<Metadata> {
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

export default async function BrandPage({ params, searchParams }: PageProps<'/brand/[slug]'>) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const brand = await getBrand(slug);
  if (!brand) notFound();

  const sort = parseSort(sp.sort);
  const page = parsePage(sp.page);
  const query = new URLSearchParams({ brand: slug, limit: String(PAGE_SIZE) });
  if (sort) query.set('sort', sort);
  if (page > 1) query.set('page', String(page));

  const demo = allPlaceholderProducts.filter((p) => p.title.toLowerCase().includes(brand.name.toLowerCase()));
  const { products, meta } = await loadProducts(`/products?${query.toString()}`, demo);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
      <Breadcrumb items={[{ label: 'All Brands', href: '/brands' }, { label: brand.name }]} />
      <h1 className="mb-6 text-2xl font-bold text-white md:text-3xl">{brand.name}</h1>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-brand-text-muted">
          {meta ? `${meta.total} ${meta.total === 1 ? 'product' : 'products'}` : `${products.length} products`}
        </p>
        <SortSelect />
      </div>

      {products.length === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-dashed border-white/15 text-sm text-brand-text-muted">
          No {brand.name} products yet — check back soon.
        </div>
      ) : (
        <ProductGrid>
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 4} />
          ))}
        </ProductGrid>
      )}

      {meta && (
        <Pagination
          basePath={`/brand/${slug}`}
          params={{ sort }}
          page={Math.min(page, Math.max(meta.pages, 1))}
          pages={meta.pages}
        />
      )}
    </div>
  );
}
