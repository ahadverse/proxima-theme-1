import { z } from 'zod';
import { strongPassword } from './auth.validators.js';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(100).optional(),
  // An empty string clears the email.
  email: z.string().trim().email('Enter a valid email').or(z.literal('')).optional(),
});

export const addressSchema = z.object({
  label: z.string().trim().min(1).max(30).default('Home'),
  fullAddress: z.string().trim().min(5, 'Enter your full address').max(500),
  area: z.enum(['inside_dhaka', 'outside_dhaka']).default('inside_dhaka'),
  isDefault: z.boolean().optional(),
});

export const updateAddressSchema = addressSchema.partial();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password').max(200),
  newPassword: strongPassword(8),
});
