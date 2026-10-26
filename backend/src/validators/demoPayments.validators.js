import { z } from 'zod';
import { phoneSchema } from './order.validators.js';

export const demoPaymentProviderSchema = z.enum(['paystation', 'bkash', 'nagad']);

/** What the demo store sends to start a sandbox payment for an order that only exists in the visitor's browser. */
export const startDemoPaymentSchema = z.object({
  orderNumber: z.string().regex(/^MRN-\d{6}-\d{6}$/, 'Invalid order number'),
  amount: z.number().positive().max(100_000_000),
  name: z.string().trim().min(1).max(100),
  phone: phoneSchema,
  email: z.string().trim().email().optional(),
  returnUrl: z.string().url().max(300),
});

export const verifyDemoReceiptSchema = z.object({
  receipt: z.string().min(10).max(2000),
});
