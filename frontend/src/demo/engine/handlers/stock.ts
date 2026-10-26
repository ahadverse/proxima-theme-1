import type { Tx } from '../db';
import type { Doc } from '../types';

/*
 * Stock changes — the API's stock.service.js. There, each is one atomic database update ("take 2 only if 2 are there");
 * here a change runs start to finish without any other request in between, which gives the same guarantee.
 */

/** Product.recomputeStockStatus: out of stock at 0, low stock at or under the product's threshold. */
export function recomputeStockStatus(product: Doc) {
  const total =
    product.productType === 'variable'
      ? (product.variants ?? []).reduce((sum: number, v: Doc) => sum + (v.stock ?? 0), 0)
      : (product.stock ?? 0);
  product.stockStatus = total <= 0 ? 'out_of_stock' : total <= product.lowStockThreshold ? 'low_stock' : 'in_stock';
}

const stockOf = (product: Doc, variantSku: string | null) =>
  variantSku ? (product.variants.find((v: Doc) => v.sku === variantSku)?.stock ?? 0) : product.stock;

interface StockChange {
  productId: string;
  variantSku?: string | null;
  quantity: number;
}

/**
 * Takes `quantity` units out of stock — of a simple product, or of one variant. Null (changing nothing) if there isn't
 * enough, or — unless `requireActive` is off (an admin adjusting a draft) — if the product isn't on sale.
 */
export function takeStock(tx: Tx, { productId, variantSku = null, quantity, requireActive = true }: StockChange & { requireActive?: boolean }) {
  const current = tx.get('products', productId);
  if (!current || (requireActive && current.status !== 'active')) return null;
  if (variantSku) {
    const variant = current.variants.find((v: Doc) => v.sku === variantSku);
    if (!variant || variant.stock < quantity) return null;
  } else if (current.stock < quantity) {
    return null;
  }

  const product = tx.edit('products', productId) as Doc;
  if (variantSku) product.variants.find((v: Doc) => v.sku === variantSku).stock -= quantity;
  else product.stock -= quantity;
  recomputeStockStatus(product);
  return { product, resultingStock: stockOf(product, variantSku) };
}

/** Puts units back (a cancelled or returned order, or a rollback). Null if the product — or the variant — is gone. */
export function putBackStock(tx: Tx, { productId, variantSku = null, quantity }: StockChange) {
  const current = tx.get('products', productId);
  if (!current || (variantSku && !current.variants.some((v: Doc) => v.sku === variantSku))) return null;

  const product = tx.edit('products', productId) as Doc;
  if (variantSku) product.variants.find((v: Doc) => v.sku === variantSku).stock += quantity;
  else product.stock += quantity;
  recomputeStockStatus(product);
  return { product, resultingStock: stockOf(product, variantSku) };
}
