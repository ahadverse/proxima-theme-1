import type {
  CategorySummary,
  CategoryWithChildren,
  BrandSummary,
  Product,
  ProductCard,
  ProductVariant,
  SpecGroup,
} from '@/types/catalog';

interface RawRef {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
}

export function mapCategory(raw: RawRef & { image?: string; icon?: string }): CategorySummary {
  return { id: raw._id, name: raw.name, slug: raw.slug, image: raw.image, icon: raw.icon };
}

export function mapBrand(raw: RawRef): BrandSummary {
  return { id: raw._id, name: raw.name, slug: raw.slug, logo: raw.logo };
}

export interface RawCategory extends RawRef {
  image?: string;
  icon?: string;
  parent: string | null;
}

/** Groups the flat `/categories?all=true` list (every category, with a `parent` id or null)
 * into top-level categories carrying their own subcategories — what the mega menu renders. */
export function buildCategoryTree(raw: RawCategory[]): CategoryWithChildren[] {
  const childrenByParent = new Map<string, CategorySummary[]>();
  for (const c of raw) {
    if (!c.parent) continue;
    const list = childrenByParent.get(c.parent) ?? [];
    list.push(mapCategory(c));
    childrenByParent.set(c.parent, list);
  }

  return raw
    .filter((c) => !c.parent)
    .map((c) => ({ ...mapCategory(c), children: childrenByParent.get(c._id) ?? [] }));
}

interface RawVariant {
  _id: string;
  sku: string;
  attributes: { attribute: RawRef | string; value: string }[];
  price: number;
  compareAtPrice?: number | null;
  stock: number;
  images?: { url: string; publicId?: string }[];
}

function mapVariant(raw: RawVariant): ProductVariant {
  return {
    id: raw._id,
    sku: raw.sku,
    attributes: raw.attributes.map((a) => ({
      attribute: typeof a.attribute === 'string' ? a.attribute : a.attribute._id,
      attributeName: typeof a.attribute === 'string' ? '' : a.attribute.name,
      value: a.value,
    })),
    price: raw.price,
    compareAtPrice: raw.compareAtPrice ?? null,
    stock: raw.stock,
    images: raw.images,
  };
}

export interface RawProduct {
  _id: string;
  title: string;
  slug: string;
  category: RawRef;
  brand?: RawRef;
  productType: 'simple' | 'variable';
  description: string;
  shortHighlights: string[];
  images: { url: string; publicId?: string }[];
  basePrice: number;
  compareAtPrice?: number | null;
  stock: number;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  variants: RawVariant[];
  specifications: SpecGroup[];
  warrantyInfo?: string;
  seo?: { metaTitle?: string; metaDescription?: string; ogImage?: string; noIndex?: boolean };
  isFlashSale: boolean;
  flashSaleEndsAt?: string | null;
  isTrending: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isFeatured: boolean;
  ratingsAverage: number;
  ratingsCount: number;
}

export function mapProductCard(raw: RawProduct): ProductCard & { category: CategorySummary } {
  return {
    id: raw._id,
    title: raw.title,
    slug: raw.slug,
    images: raw.images,
    basePrice: raw.basePrice,
    compareAtPrice: raw.compareAtPrice,
    stockStatus: raw.stockStatus,
    ratingsAverage: raw.ratingsAverage,
    ratingsCount: raw.ratingsCount,
    productType: raw.productType,
    variants: raw.variants.map(mapVariant),
    flashSaleEndsAt: raw.flashSaleEndsAt,
    category: mapCategory(raw.category),
  };
}

export function mapProductDetail(raw: RawProduct): Product {
  return {
    id: raw._id,
    title: raw.title,
    slug: raw.slug,
    category: mapCategory(raw.category),
    brand: raw.brand ? mapBrand(raw.brand) : undefined,
    productType: raw.productType,
    description: raw.description,
    shortHighlights: raw.shortHighlights ?? [],
    images: raw.images ?? [],
    basePrice: raw.basePrice,
    compareAtPrice: raw.compareAtPrice,
    stock: raw.stock,
    stockStatus: raw.stockStatus,
    variants: (raw.variants ?? []).map(mapVariant),
    specifications: raw.specifications ?? [],
    warrantyInfo: raw.warrantyInfo,
    seo: raw.seo,
    isFlashSale: raw.isFlashSale,
    flashSaleEndsAt: raw.flashSaleEndsAt,
    isTrending: raw.isTrending,
    isBestSeller: raw.isBestSeller,
    isNewArrival: raw.isNewArrival,
    isFeatured: raw.isFeatured,
    ratingsAverage: raw.ratingsAverage,
    ratingsCount: raw.ratingsCount,
  };
}
