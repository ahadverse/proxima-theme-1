import { apiGet, apiGetResult } from '@/lib/api';
import { buildCategoryTree, mapBrand, mapCategory, mapProductCard, type RawCategory, type RawProduct } from '@/lib/mappers';
import { brandStrip, navCategories } from '@/lib/placeholder-data';
import type { BrandSummary, CategorySummary, CategoryWithChildren, ProductCard } from '@/types/catalog';

/** The header's category menu. Demo categories only while the API is unreachable; a store with none shows no menu. */
export async function loadNavCategories(): Promise<CategoryWithChildren[]> {
  const categories = await apiGet<RawCategory[]>('/categories?all=true', { revalidate: 300 });
  if (categories) return buildCategoryTree(categories);
  return navCategories.map((c) => ({ ...c, children: [] }));
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ProductPage {
  products: ProductCard[];
  /** Paging info from the API; null while demo products stand in for an unreachable API. */
  meta: PageMeta | null;
}

function readMeta(meta: Record<string, unknown> | null): PageMeta | null {
  if (!meta || typeof meta.total !== 'number' || typeof meta.pages !== 'number') return null;
  return { total: meta.total, page: Number(meta.page) || 1, limit: Number(meta.limit) || 0, pages: meta.pages };
}

/**
 * A page of products from the catalogue API. The demo products stand in only when the API can't be
 * reached — when the store answers "nothing matches", that is what the shopper is shown.
 */
export async function loadProducts(path: string, demo: ProductCard[], revalidate = 60): Promise<ProductPage> {
  const { status, data, meta } = await apiGetResult<RawProduct[]>(path, { revalidate });
  if (data) return { products: data.map(mapProductCard), meta: readMeta(meta) };
  // A 4xx means the API understood the request and refused it (a malformed filter in the URL): there's
  // nothing to show for it. Only an API that can't be reached, or is failing, gets demo products.
  if (status >= 400 && status < 500) return { products: [], meta: null };
  return { products: demo, meta: null };
}

/** Categories and brands for the filter sidebar. Demo lists only while the API is unreachable. */
export async function loadFilterOptions(): Promise<{ categories: CategorySummary[]; brands: BrandSummary[] }> {
  const [categories, brands] = await Promise.all([
    apiGet<Parameters<typeof mapCategory>[0][]>('/categories', { revalidate: 300 }),
    apiGet<Parameters<typeof mapBrand>[0][]>('/brands', { revalidate: 300 }),
  ]);
  return {
    categories: categories ? categories.map(mapCategory) : navCategories,
    brands: brands ? brands.map(mapBrand) : brandStrip,
  };
}
