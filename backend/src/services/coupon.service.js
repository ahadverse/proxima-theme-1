import { Coupon } from '../models/Coupon.js';
import { ApiError } from '../utils/ApiError.js';

const round2 = (n) => Math.round(n * 100) / 100;

/** What a coupon takes off a given subtotal — never more than the subtotal itself. */
export function discountFor(coupon, subtotal) {
  let discount = coupon.type === 'percentage' ? (subtotal * coupon.value) / 100 : coupon.value;
  if (coupon.maxDiscountAmount) discount = Math.min(discount, coupon.maxDiscountAmount);
  return round2(Math.min(discount, subtotal));
}

/**
 * The last moment a coupon can be used. The admin picks an expiry *date*, which is stored as that
 * day's midnight — read literally the coupon would die the moment its last day began, so a date
 * with no time of day means "through the end of that day".
 */
function expiryInstant(coupon) {
  const end = new Date(coupon.expiresAt);
  const isDateOnly = end.getUTCHours() === 0 && end.getUTCMinutes() === 0 && end.getUTCSeconds() === 0;
  return isDateOnly ? new Date(end.getTime() + 24 * 60 * 60 * 1000 - 1) : end;
}

/**
 * Looks a coupon up and checks every rule against this subtotal: switched on, inside its dates,
 * not used up, and the order is big enough. Throws a message a customer can act on.
 */
export async function evaluateCoupon(code, subtotal, now = new Date()) {
  const coupon = await Coupon.findOne({ code: String(code).trim().toUpperCase(), status: 'active' });
  if (!coupon) throw ApiError.badRequest('Invalid or expired coupon code');

  if (coupon.startsAt && now < coupon.startsAt) throw ApiError.badRequest('This coupon is not active yet');
  if (coupon.expiresAt && now > expiryInstant(coupon)) throw ApiError.badRequest('This coupon has expired');
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw ApiError.badRequest('This coupon has reached its usage limit');
  }
  if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
    throw ApiError.badRequest(`Spend ৳${coupon.minOrderAmount.toLocaleString()} or more to use this coupon`);
  }

  return { coupon, discount: discountFor(coupon, subtotal) };
}

/**
 * Uses up one redemption. The usage limit is part of the same atomic update, so two orders placed at
 * the same moment can't both take the last one.
 */
export async function redeemCoupon(coupon) {
  const filter = { _id: coupon._id, ...(coupon.usageLimit ? { usedCount: { $lt: coupon.usageLimit } } : {}) };
  const updated = await Coupon.findOneAndUpdate(filter, { $inc: { usedCount: 1 } }, { new: true });
  if (!updated) throw ApiError.badRequest('This coupon has reached its usage limit');
  return updated;
}

/** Gives a redemption back (an order that failed after the coupon was already counted). */
export async function releaseCoupon(coupon) {
  await Coupon.updateOne({ _id: coupon._id, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
}
