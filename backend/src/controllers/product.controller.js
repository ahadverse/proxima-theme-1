import { Product } from '../models/Product.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import * as productService from '../services/product.service.js';

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await productService.listProducts(req.query);
  sendSuccess(res, { data: items, meta });
});

export const adminList = asyncHandler(async (req, res) => {
  const { items, meta } = await productService.listProductsAdmin(req.query);
  sendSuccess(res, { data: items, meta });
});

export const featured = (type) =>
  asyncHandler(async (req, res) => {
    const { limit, sort } = req.query;
    const items = await productService.getFeaturedList(type, { limit, sort });
    sendSuccess(res, { data: items });
  });

export const getOne = asyncHandler(async (req, res) => {
  const product = await productService.getProductBySlug(req.params.slug);
  const related = await productService.getRelatedProducts(product);
  sendSuccess(res, { data: { ...product.toObject(), related } });
});

export const create = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body);
  sendSuccess(res, { statusCode: 201, message: 'Product created', data: product });
});

export const update = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  sendSuccess(res, { message: 'Product updated', data: product });
});

export const remove = asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.params.id);
  sendSuccess(res, { message: 'Product deleted' });
});

export const updateStock = asyncHandler(async (req, res) => {
  const { quantityChange, variantSku, note } = req.body;
  const product = await productService.adjustStock(req.params.id, {
    quantityChange,
    variantSku,
    note,
    changedBy: req.admin._id,
  });
  sendSuccess(res, { message: 'Stock updated', data: product });
});

export const getById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  sendSuccess(res, { data: product });
});
