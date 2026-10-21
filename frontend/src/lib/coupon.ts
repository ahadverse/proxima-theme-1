import { apiMutate } from '@/lib/api';

export interface AppliedCoupon {
  code: string;
  discount: number;
}

/** Asks the store whether a coupon works for this subtotal and what it takes off. Nothing is used up until the order is placed. */
export async function checkCoupon(
  code: string,
  subtotal: number
): Promise<{ ok: true; coupon: AppliedCoupon } | { ok: false; message: string }> {
  const result = await apiMutate<{ code: string; discount: number }>('/coupons/validate', 'POST', {
    code,
    subtotal,
  });
  if (result.ok && result.data) return { ok: true, coupon: { code: result.data.code, discount: result.data.discount } };
  return { ok: false, message: result.message || "That coupon couldn't be applied" };
}
