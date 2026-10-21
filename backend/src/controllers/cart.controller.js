import { asyncHandler } from '../middlewares/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as cartService from '../services/cart.service.js';

export const getCart = asyncHandler(async (req, res) => {
  const cart = await cartService.getCartView(req.cartOwner);
  sendSuccess(res, { data: cart });
});

export const addItem = asyncHandler(async (req, res) => {
  const cart = await cartService.addItem(req.cartOwner, req.body);
  sendSuccess(res, { message: 'Item added to cart', data: cart });
});

export const updateItem = asyncHandler(async (req, res) => {
  const cart = await cartService.updateItemQuantity(req.cartOwner, req.params.itemId, req.body.quantity);
  sendSuccess(res, { message: 'Cart updated', data: cart });
});

export const removeItem = asyncHandler(async (req, res) => {
  const cart = await cartService.removeItem(req.cartOwner, req.params.itemId);
  sendSuccess(res, { message: 'Item removed', data: cart });
});

export const applyCoupon = asyncHandler(async (req, res) => {
  const cart = await cartService.applyCoupon(req.cartOwner, req.body.code);
  sendSuccess(res, { message: 'Coupon applied', data: cart });
});
