// Copied from backend/src/validators/auth.validators.js by scripts/demo/sync-backend.mjs — edit the original, then run that script.
import { z } from 'zod3';
import { phoneSchema } from './order.validators.js';

// Passwords everyone tries first. (Length does most of the work; this stops the obvious ones.)
const COMMON_PASSWORDS = new Set([
  '123456', '1234567', '12345678', '123456789', '1234567890', '12345678910', '111111', '000000', 'password', 'password1',
  'password123', 'qwerty', 'qwerty123', 'abc123', 'iloveyou', 'admin123', 'changeme', 'changeme123!', 'welcome1',
]);

/**
 * A password to set. At most 72 characters because bcrypt only reads the first 72 bytes: a longer one would be silently
 * cut short.
 */
export const strongPassword = (min) =>
  z
    .string()
    .min(min, `Password must be at least ${min} characters`)
    .max(72, 'Password can be at most 72 characters')
    .refine((value) => !COMMON_PASSWORDS.has(value.toLowerCase()), 'That password is too common — choose another');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(100),
  phone: phoneSchema,
  email: z.string().email().optional().or(z.literal('')).optional(),
  password: strongPassword(8),
});

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'Password is required').max(200),
});

export const adminLoginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required').max(200),
});

export const staffCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: strongPassword(10),
  role: z.enum(['super-admin', 'staff']).default('staff'),
});

export const staffUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['super-admin', 'staff']).optional(),
  isActive: z.boolean().optional(),
  password: strongPassword(10).optional(),
});
