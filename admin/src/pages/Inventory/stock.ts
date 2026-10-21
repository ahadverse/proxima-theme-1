import type { Product, ProductVariant } from '@/types/product';

/** What's on the shelf: a simple product's stock, or the sum over a variable product's variants. */
export function totalStock(product: Pick<Product, 'productType' | 'stock' | 'variants'>): number {
  return product.productType === 'variable'
    ? product.variants.reduce((sum, v) => sum + v.stock, 0)
    : product.stock;
}

/** "Black / 256GB" — the values that tell a variant apart, or its SKU if it has none. */
export function variantLabel(variant: ProductVariant): string {
  return variant.attributes.map((a) => a.value).join(' / ') || variant.sku;
}
