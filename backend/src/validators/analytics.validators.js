import { z } from 'zod';

// What the browser may report. 'purchase' is deliberately absent: sales are recorded by the server
// when an order is placed, never taken on a browser's word.
export const trackEventSchema = z.object({
  type: z.enum(['view', 'add_to_cart']),
  product: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid product id'),
  variantSku: z.string().trim().max(64).nullable().optional(),
  quantity: z.coerce.number().int().min(1).max(99).optional(),
});

export const rangeQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export const productsQuerySchema = rangeQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
