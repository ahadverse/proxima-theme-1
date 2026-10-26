import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { FilterSidebar } from '@/components/filters/FilterSidebar';
import { SortSelect } from '@/components/filters/SortSelect';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductCard } from '@/components/product/ProductCard';
import { Pagination } from '@/components/ui/Pagination';
import { apiGetResult } from '@/lib/api';
import { loadFilterOptions, loadProducts } from '@/lib/catalog';
import { parsePage, parseSort } from '@/lib/listing';
import { mapCategory } from '@/lib/mappers';
import { newArrivals, flashSaleProducts, trendingProducts, navCategories } from '@/lib/placeholder-data';
import type { CategorySummary } from '@/types/catalog';

const PAGE_SIZE = 24;

function getPlaceholderCategoryProducts(slug: string) {
  const all = [...newArrivals, ...flashSaleProducts, ...trendingProducts];
  const seen = new Set<string>();
  return all.filter((p) => {
    if (p.category.slug !== slug) return false;
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

/** The category, or null if the store says there's no such category. Demo categories only while the API is unreachable. */
export async function getCategory(slug: string): Promise<CategorySummary | null> {
  const { status, data } = await apiGetResult<Parameters<typeof mapCategory>[0]>(
    `/categories/${encodeURIComponent(slug)}`,
    { revalidate: 300 }
  );
  if (data) return mapCategory(data);
  if (status === 404) return null;
  return navCategories.find((c) => c.slug === slug) ?? null;
}

export default async function CategoryPage({ params, searchParams }: PageProps<'/category/[slug]'>) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const category = await getCategory(slug);
  if (!category) notFound();

  const sort = parseSort(sp.sort);
  const page = parsePage(sp.page);
  const query = new URLSearchParams({ category: slug, limit: String(PAGE_SIZE) });
  if (sort) query.set('sort', sort);
  if (page > 1) query.set('page', String(page));

  const [{ products, meta }, { categories, brands }] = await Promise.all([
    loadProducts(`/products?${query.toString()}`, getPlaceholderCategoryProducts(slug)),
    loadFilterOptions(),
  ]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
      <Breadcrumb items={[{ label: 'All Products', href: '/products' }, { label: category.name }]} />
      <h1 className="mb-6 text-2xl font-bold text-white md:text-3xl">{category.name}</h1>

      <div className="flex flex-col gap-8 lg:flex-row">
        <FilterSidebar categories={categories} brands={brands} defaults={{ category: slug }} />

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p role="status" className="text-sm text-brand-text-muted">
              {meta ? `${meta.total} ${meta.total === 1 ? 'product' : 'products'}` : `${products.length} products`}
            </p>
            <SortSelect />
          </div>

          {products.length === 0 ? (
            <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-dashed border-white/15 text-sm text-brand-text-muted">
              No products in this category yet — check back soon.
            </div>
          ) : (
            // Keyed by the query, so a new sort / page replaces the grid instead of shuffling the cards already on screen
            // (which the browser counts as the whole page jumping).
            <ProductGrid key={query.toString()}>
              {products.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 4} />
              ))}
            </ProductGrid>
          )}

          {meta && (
            <Pagination
              basePath={`/category/${slug}`}
              params={{ sort }}
              page={Math.min(page, Math.max(meta.pages, 1))}
              pages={meta.pages}
            />
          )}
        </div>
      </div>
    </div>
  );
}
