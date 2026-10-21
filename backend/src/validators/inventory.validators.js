import { z } from 'zod';

export const inventoryQuerySchema = z.object({
  product: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid product id').optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
