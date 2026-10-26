// Copied from backend/src/validators/order.validators.js by scripts/demo/sync-backend.mjs — edit the original, then run that script.
import { z } from 'zod3';
import { normalizePhone } from '../utils/phone.js';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

// Digits with the usual separators — enough to reject "abc" without dictating a country's format.
// (Keeping it loose on purpose: the store may serve numbers like 017xxxxxxxx or +88017xxxxxxxx.)
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s-]{6,18}[0-9]$/, 'Enter a valid phone number')
  .transform(normalizePhone);

const orderItemSchema = z.object({
  product: objectId,
  variantSku: z.string().trim().max(64).nullable().optional(),
  // Prices, titles and images are always taken from the catalogue — whatever the browser sends for
  // them is ignored — so only the product, option and quantity matter here.
  title: z.string().optional(),
  variantLabel: z.string().nullable().optional(),
  image: z.string().optional(),
  price: z.number().optional(),
  quantity: z.number().int('Quantity must be a whole number').min(1).max(99),
});

export const createOrderSchema = z.object({
  guestInfo: z
    .object({
      name: z.string().trim().min(2, 'Enter your name').max(100).optional(),
      email: z.string().trim().email('Enter a valid email').or(z.literal('')).optional(),
      phone: phoneSchema.optional(),
    })
    .optional(),
  items: z.array(orderItemSchema).min(1).max(50),
  shippingAddress: z.object({
    fullAddress: z.string().trim().min(5, 'Enter your full address').max(500),
    area: z.enum(['inside_dhaka', 'outside_dhaka']),
    phone: phoneSchema,
  }),
  paymentMethod: z.enum(['cod', 'paystation', 'bkash', 'nagad']),
  couponCode: z.string().trim().max(40).optional(),
});

export const validateCouponSchema = z.object({
  code: z.string().trim().min(1, 'Enter a coupon code').max(40),
  subtotal: z.number().min(0),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']),
  note: z.string().trim().max(500).optional(),
});

export const updateOrderPaymentSchema = z.object({
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']),
  transactionId: z.string().optional(),
});

export const adminOrderQuerySchema = z.object({
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']).optional(),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
