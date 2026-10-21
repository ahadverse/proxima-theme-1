export interface ProductImage {
  url: string;
  publicId?: string;
}

export interface ProductVariantAttribute {
  attribute: string;
  attributeName: string;
  value: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  attributes: ProductVariantAttribute[];
  price: number;
  compareAtPrice?: number | null;
  stock: number;
  images?: ProductImage[];
}

export interface SpecGroup {
  groupName: string;
  items: { label: string; value: string }[];
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  image?: string;
  icon?: string;
}

export interface CategoryWithChildren extends CategorySummary {
  children: CategorySummary[];
}

export interface BrandSummary {
  id: string;
  name: string;
  slug: string;
  logo?: string;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  category: CategorySummary;
  brand?: BrandSummary;
  productType: 'simple' | 'variable';
  description: string;
  shortHighlights: string[];
  images: ProductImage[];
  basePrice: number;
  compareAtPrice?: number | null;
  stock: number;
  stockStatus: StockStatus;
  variants: ProductVariant[];
  specifications: SpecGroup[];
  warrantyInfo?: string;
  /** Search-engine title/description the admin wrote for this product, if any. */
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

export type ProductCard = Pick<
  Product,
  | 'id'
  | 'title'
  | 'slug'
  | 'images'
  | 'basePrice'
  | 'compareAtPrice'
  | 'stockStatus'
  | 'ratingsAverage'
  | 'ratingsCount'
  | 'productType'
  | 'variants'
  | 'flashSaleEndsAt'
> & { badge?: string };
