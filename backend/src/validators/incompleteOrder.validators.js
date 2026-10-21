import { z } from 'zod';
import { phoneSchema } from './order.validators.js';

export const captureIncompleteOrderSchema = z.object({
  name: z.string().optional(),
  phone: phoneSchema,
  email: z.string().optional(),
  address: z.string().optional(),
  cartSnapshot: z
    .array(
      z.object({
        product: z.string().optional(),
        title: z.string().optional(),
        variantSku: z.string().nullable().optional(),
        quantity: z.number().optional(),
        price: z.number().optional(),
      })
    )
    .optional(),
  totalValue: z.number().optional(),
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
