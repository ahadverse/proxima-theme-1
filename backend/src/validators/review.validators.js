import { z } from 'zod';

export const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(150).optional(),
  comment: z.string().trim().min(1).max(2000),
});

export const adminReviewQuerySchema = z.object({
  isApproved: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
