import { z } from 'zod';
import { phoneSchema } from './order.validators.js';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(100),
  phone: phoneSchema,
  email: z.string().email().optional().or(z.literal('')).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
});

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'Password is required'),
});

export const adminLoginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const staffCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['super-admin', 'staff']).default('staff'),
});

export const staffUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['super-admin', 'staff']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});
