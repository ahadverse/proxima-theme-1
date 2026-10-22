import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { FilterSidebar } from '@/components/filters/FilterSidebar';
import { SortSelect } from '@/components/filters/SortSelect';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductCard } from '@/components/product/ProductCard';
import { Pagination } from '@/components/ui/Pagination';
import { loadFilterOptions, loadProducts } from '@/lib/catalog';
import { parsePage, parseSort } from '@/lib/listing';
import { allPlaceholderProducts } from '@/lib/placeholder-data';

// Reads filter/search query params per request — no static shell worth prerendering.
export const instant = false;

const PAGE_SIZE = 24;

type Filters = {
  q?: string;
  category?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  rating?: string;
  inStock?: string;
  sort?: string;
};

function readFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const text = (key: string) => (typeof sp[key] === 'string' && sp[key] ? (sp[key] as string) : undefined);
  return {
    q: text('q')?.slice(0, 100),
    category: text('category'),
    brand: text('brand'),
    minPrice: text('minPrice'),
    maxPrice: text('maxPrice'),
    rating: text('rating'),
    inStock: text('inStock') === 'true' ? 'true' : undefined,
    sort: parseSort(sp.sort),
  };
}

function hasFilters(filters: Filters) {
  return Object.values(filters).some(Boolean);
}

export async function generateMetadata({ searchParams }: PageProps<'/products'>): Promise<Metadata> {
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

function matchesDemo(filters: Filters) {
  const lower = filters.q?.toLowerCase();
  return lower ? allPlaceholderProducts.filter((p) => p.title.toLowerCase().includes(lower)) : allPlaceholderProducts;
}

export default async function ProductsPage({ searchParams }: PageProps<'/products'>) {
  const sp = await searchParams;
  const filters = readFilters(sp);
  const page = parsePage(sp.page);

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) query.set(key, value);
  }
  query.set('limit', String(PAGE_SIZE));
  if (page > 1) query.set('page', String(page));

  const [{ products, meta }, { categories, brands }] = await Promise.all([
    loadProducts(`/products?${query.toString()}`, matchesDemo(filters)),
    loadFilterOptions(),
  ]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
      <Breadcrumb items={[{ label: 'All Products' }]} />
      <h1 className="mb-6 text-2xl font-bold text-white md:text-3xl">
        {filters.q ? `Search results for "${filters.q}"` : 'All Products'}
      </h1>

      <div className="flex flex-col gap-8 lg:flex-row">
        <FilterSidebar categories={categories} brands={brands} />

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p role="status" className="text-sm text-brand-text-muted">
              {meta ? `${meta.total} ${meta.total === 1 ? 'product' : 'products'}` : `${products.length} products`}
            </p>
            <SortSelect />
          </div>

          {products.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/15 px-4 text-center text-sm text-brand-text-muted">
              <p>{hasFilters(filters) ? 'No products match your search or filters.' : 'There are no products yet — check back soon.'}</p>
              {hasFilters(filters) && (
                <Link href="/products" className="font-semibold text-brand-accent hover:underline">
                  Clear all filters
                </Link>
              )}
            </div>
          ) : (
            // Keyed by the query, so a new sort / filter / page replaces the grid instead of shuffling the cards already on
            // screen (which the browser counts as the whole page jumping).
            <ProductGrid key={query.toString()}>
              {products.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 4} />
              ))}
            </ProductGrid>
          )}

          {meta && (
            <Pagination
              basePath="/products"
              params={{ ...filters }}
              page={Math.min(page, Math.max(meta.pages, 1))}
              pages={meta.pages}
            />
          )}
        </div>
      </div>
    </div>
  );
}
