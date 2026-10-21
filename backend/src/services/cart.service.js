import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { Coupon } from '../models/Coupon.js';
import { discountFor, evaluateCoupon } from './coupon.service.js';
import { ApiError } from '../utils/ApiError.js';

function ownerFilter({ userId, sessionId }) {
  return userId ? { user: userId, status: 'active' } : { sessionId, status: 'active' };
}

export async function getOrCreateCart(owner) {
  let cart = await Cart.findOne(ownerFilter(owner));
  if (!cart) {
    cart = await Cart.create({
      user: owner.userId || null,
      sessionId: owner.userId ? null : owner.sessionId,
    });
  }
  return cart;
}

function findVariant(product, variantSku) {
  if (!variantSku) return null;
  const variant = product.variants.find((v) => v.sku === variantSku);
  if (!variant) throw ApiError.badRequest('Selected variant not found');
  return variant;
}

export async function addItem(owner, { productId, variantSku, quantity = 1 }) {
  const product = await Product.findById(productId);
  if (!product || product.status !== 'active') throw ApiError.notFound('Product not found');

  const variant = findVariant(product, variantSku);
  const price = variant ? variant.price : product.basePrice;
  const stock = variant ? variant.stock : product.stock;
  if (stock <= 0) throw ApiError.badRequest('This product is out of stock');

  const cart = await getOrCreateCart(owner);
  const existing = cart.items.find(
    (i) => i.product.toString() === productId && (i.variantSku || null) === (variantSku || null)
  );

  if (existing) {
    existing.quantity = Math.min(existing.quantity + quantity, stock);
  } else {
    cart.items.push({ product: productId, variantSku: variantSku || null, quantity, priceAtAdd: price });
  }

  await cart.save();
  return getCartView(cart);
}

export async function updateItemQuantity(owner, itemId, quantity) {
  const cart = await getOrCreateCart(owner);
  const item = cart.items.id(itemId);
  if (!item) throw ApiError.notFound('Cart item not found');

  if (quantity <= 0) {
    item.deleteOne();
  } else {
    item.quantity = quantity;
  }

  await cart.save();
  return getCartView(cart);
}

export async function removeItem(owner, itemId) {
  const cart = await getOrCreateCart(owner);
  cart.items.id(itemId)?.deleteOne();
  await cart.save();
  return getCartView(cart);
}

export async function applyCoupon(owner, code) {
  const cart = await getOrCreateCart(owner);
  // Checked against what's in the cart right now (dates, usage limit, minimum order).
  const { coupon } = await evaluateCoupon(code, (await getCartView(cart)).subtotal);

  cart.couponCode = coupon.code;
  await cart.save();
  return getCartView(cart);
}

export async function getCartView(cartOrOwner) {
  const cart = cartOrOwner.items ? cartOrOwner : await getOrCreateCart(cartOrOwner);
  const populated = await cart.populate({
    path: 'items.product',
    select: 'title slug images stock variants stockStatus',
  });

  const items = populated.items.map((item) => {
    const product = item.product;
    const variant = item.variantSku ? product?.variants.find((v) => v.sku === item.variantSku) : null;
    return {
      id: item._id,
      product: product?._id,
      slug: product?.slug,
      title: product?.title,
      image: variant?.images?.[0]?.url ?? product?.images?.[0]?.url,
      variantSku: item.variantSku,
      quantity: item.quantity,
      price: item.priceAtAdd,
      lineTotal: item.priceAtAdd * item.quantity,
      maxStock: variant ? variant.stock : product?.stock,
    };
  });

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);

  let discount = 0;
  let coupon = null;
  if (cart.couponCode) {
    coupon = await Coupon.findOne({ code: cart.couponCode });
    if (coupon) discount = discountFor(coupon, subtotal);
  }

  return {
    id: cart._id,
    items,
    couponCode: cart.couponCode,
    subtotal,
    discount,
    total: subtotal - discount,
  };
}
