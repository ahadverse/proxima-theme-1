import { Product } from '../models/Product.js';

/*
 * Stock changes for orders. They are single atomic updates — "take 2 only if at least 2 are there" —
 * rather than read, subtract, save: two customers buying the last unit at the same moment can't both
 * succeed, and a failed order never leaves stock half-taken.
 */

/**
 * Atomic $inc updates skip the model's pre-save hook, so the stored stockStatus is refreshed here.
 *
 * The status is worked out inside the database from the stock as it is at that instant (an update
 * pipeline), not from the copy this request got back from its own $inc: with many orders landing at
 * once, a request holding an older copy would otherwise write "low stock" over the final "out of stock".
 * This mirrors Product.recomputeStockStatus.
 */
async function syncStockStatus(product) {
  product.recomputeStockStatus(); // the copy handed back to the caller
  const total = { $cond: [{ $eq: ['$productType', 'variable'] }, { $sum: '$variants.stock' }, '$stock'] };
  await Product.updateOne(
    { _id: product._id },
    [
      {
        $set: {
          stockStatus: {
            $switch: {
              branches: [
                { case: { $lte: [total, 0] }, then: 'out_of_stock' },
                { case: { $lte: [total, '$lowStockThreshold'] }, then: 'low_stock' },
              ],
              default: 'in_stock',
            },
          },
        },
      },
    ],
    { timestamps: false }
  );
}

const stockOf = (product, variantSku) =>
  variantSku ? (product.variants.find((v) => v.sku === variantSku)?.stock ?? 0) : product.stock;

function updateFor(variantSku, delta) {
  return variantSku
    ? { update: { $inc: { 'variants.$[v].stock': delta } }, options: { new: true, arrayFilters: [{ 'v.sku': variantSku }] } }
    : { update: { $inc: { stock: delta } }, options: { new: true } };
}

/**
 * Takes `quantity` units out of stock — of a simple product, or of one variant. Resolves
 * { product, resultingStock }, or null (changing nothing) if there isn't enough — or, unless
 * `requireActive` is off (an admin adjusting a draft product), if the product isn't active.
 */
export async function takeStock({ productId, variantSku = null, quantity, requireActive = true }) {
  const active = requireActive ? { status: 'active' } : {};
  const filter = variantSku
    ? { _id: productId, ...active, variants: { $elemMatch: { sku: variantSku, stock: { $gte: quantity } } } }
    : { _id: productId, ...active, stock: { $gte: quantity } };
  const { update, options } = updateFor(variantSku, -quantity);

  const product = await Product.findOneAndUpdate(filter, update, options);
  if (!product) return null;

  await syncStockStatus(product);
  return { product, resultingStock: stockOf(product, variantSku) };
}

/** Puts units back (a cancelled/returned order, or a rollback). Null if the product no longer exists. */
export async function putBackStock({ productId, variantSku = null, quantity }) {
  const filter = variantSku ? { _id: productId, 'variants.sku': variantSku } : { _id: productId };
  const { update, options } = updateFor(variantSku, quantity);

  const product = await Product.findOneAndUpdate(filter, update, options);
  if (!product) return null;

  await syncStockStatus(product);
  return { product, resultingStock: stockOf(product, variantSku) };
}
