// Copied from backend/src/validators/coupon.validators.js by scripts/demo/sync-backend.mjs — edit the original, then run that script.
import { z } from 'zod3';

const base = z.object({
  code: z.string().trim().min(1).max(40),
  type: z.enum(['percentage', 'fixed']),
  value: z.number().min(0),
  minOrderAmount: z.number().min(0).optional(),
  maxDiscountAmount: z.number().min(0).nullable().optional(),
  usageLimit: z.number().int().min(0).nullable().optional(),
  startsAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

const rules = [
  // The partial update schema can't see the stored type, so this only applies when both are sent.
  [
    (v) => v.type === undefined || v.type !== 'percentage' || v.value === undefined || v.value <= 100,
    { message: "A percentage discount can't be more than 100%", path: ['value'] },
  ],
  [
    (v) => !v.startsAt || !v.expiresAt || new Date(v.expiresAt) >= new Date(v.startsAt),
    { message: 'The expiry date must be on or after the start date', path: ['expiresAt'] },
  ],
];

export const couponSchema = base.refine(...rules[0]).refine(...rules[1]);
export const couponUpdateSchema = base.partial().refine(...rules[0]).refine(...rules[1]);

export const couponQuerySchema = z.object({
  status: z.enum(['active', 'inactive']).optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
