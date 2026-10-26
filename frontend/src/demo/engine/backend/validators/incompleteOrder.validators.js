// Copied from backend/src/validators/incompleteOrder.validators.js by scripts/demo/sync-backend.mjs — edit the original, then run that script.
import { z } from 'zod3';
import { phoneSchema } from './order.validators.js';

export const captureIncompleteOrderSchema = z.object({
  name: z.string().trim().max(100).optional(),
  phone: phoneSchema,
  email: z.string().trim().max(200).optional(),
  address: z.string().trim().max(500).optional(),
  cartSnapshot: z
    .array(
      z.object({
        product: z.string().max(64).optional(),
        title: z.string().max(200).optional(),
        variantSku: z.string().max(64).nullable().optional(),
        quantity: z.number().min(0).max(99).optional(),
        price: z.number().min(0).max(100_000_000).optional(),
      })
    )
    .max(50)
    .optional(),
  totalValue: z.number().min(0).max(1_000_000_000).optional(),
  lastStep: z.enum(['cart', 'address', 'payment']).optional(),
});

export const adminListIncompleteOrderQuerySchema = z.object({
  status: z.enum(['pending', 'contacted', 'recovered', 'abandoned']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const updateIncompleteOrderStatusSchema = z.object({
  status: z.enum(['pending', 'contacted', 'recovered', 'abandoned']),
});
