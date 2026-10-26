// Copied from backend/src/validators/cart.validators.js by scripts/demo/sync-backend.mjs — edit the original, then run that script.
import { z } from 'zod3';

const quantity = z.number().int('Quantity must be a whole number').max(99);

export const addCartItemSchema = z.object({
  productId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid product id'),
  variantSku: z.string().trim().max(64).nullable().optional(),
  quantity: quantity.min(1).optional(),
});

export const updateCartItemSchema = z.object({ quantity: quantity.min(0) });

export const applyCartCouponSchema = z.object({ code: z.string().trim().min(1).max(40) });
