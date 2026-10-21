import type { Category } from '@/types/category';
import type { Brand } from '@/types/brand';
import type { Attribute } from '@/types/attribute';

export interface ProductImage {
  url: string;
  publicId?: string;
}

export interface VariantAttributeRef {
  attribute: string | Pick<Attribute, '_id' | 'name' | 'slug' | 'type'>;
  value: string;
}

export interface ProductVariant {
  _id?: string;
  sku: string;
  attributes: VariantAttributeRef[];
  price: number;
  compareAtPrice?: number;
  stock: number;
  lowStockThreshold?: number;
  images: ProductImage[];
}

export interface SpecItem {
  label: string;
  value: string;
}

export interface SpecGroup {
  groupName: string;
  items: SpecItem[];
}

export type ProductStatus = 'active' | 'draft' | 'archived';
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface Product {
  _id: string;
  title: string;
  slug: string;
  category: string | Pick<Category, '_id' | 'name' | 'slug'>;
  brand?: string | Pick<Brand, '_id' | 'name' | 'slug' | 'logo'>;
  productType: 'simple' | 'variable';
  description?: string;
  shortHighlights: string[];
  images: ProductImage[];
  basePrice: number;
  compareAtPrice?: number;
  sku?: string;
  stock: number;
  lowStockThreshold: number;
  stockStatus: StockStatus;
  attributesUsed: (string | Pick<Attribute, '_id' | 'name' | 'slug' | 'type'>)[];
  variants: ProductVariant[];
  specifications: SpecGroup[];
  warrantyInfo?: string;
  isFlashSale: boolean;
  flashSaleEndsAt?: string | null;
  isTrending: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isFeatured: boolean;
  ratingsAverage: number;
  ratingsCount: number;
  seo?: { metaTitle?: string; metaDescription?: string; ogImage?: string; noIndex?: boolean };
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  title: string;
  slug?: string;
  category: string;
  brand?: string;
  productType?: 'simple' | 'variable';
  description?: string;
  shortHighlights?: string[];
  images?: ProductImage[];
  basePrice: number;
  compareAtPrice?: number;
  sku?: string;
  stock?: number;
  lowStockThreshold?: number;
  attributesUsed?: string[];
  variants?: {
    sku: string;
    attributes: { attribute: string; value: string }[];
    price: number;
    compareAtPrice?: number;
    stock?: number;
    lowStockThreshold?: number;
    images?: ProductImage[];
  }[];
  specifications?: SpecGroup[];
  warrantyInfo?: string;
  isFlashSale?: boolean;
  flashSaleEndsAt?: string | null;
  isTrending?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isFeatured?: boolean;
  seo?: { metaTitle?: string; metaDescription?: string; ogImage?: string; noIndex?: boolean };
  status?: ProductStatus;
}
