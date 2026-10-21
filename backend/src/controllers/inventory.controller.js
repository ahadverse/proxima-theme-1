import { Product } from '../models/Product.js';
import { InventoryLog } from '../models/InventoryLog.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const lowStock = asyncHandler(async (req, res) => {
  const products = await Product.find({ stockStatus: { $in: ['low_stock', 'out_of_stock'] } })
    .select('title slug images stock stockStatus lowStockThreshold productType variants')
    .sort({ stock: 1 });
  sendSuccess(res, { data: products });
});

export const list = asyncHandler(async (req, res) => {
  const { product, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (product) filter.product = product;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    InventoryLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('product', 'title slug')
      .populate('changedBy', 'name'),
    InventoryLog.countDocuments(filter),
  ]);

  sendSuccess(res, { data: items, meta: { total, page, limit, pages: Math.ceil(total / limit) } });
});
