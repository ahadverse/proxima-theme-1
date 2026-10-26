// Copied from backend/src/validators/catalog.validators.js by scripts/demo/sync-backend.mjs — edit the original, then run that script.
import { z } from 'zod3';

export const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  parent: z.string().nullable().optional(),
  image: z.string().optional(),
  icon: z.string().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

// A new order for a list: every id once, first to last. For categories, `parent` says whose subcategories they are
// (null / left out = the top-level ones).
const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');
export const reorderSchema = z.object({
  ids: z
    .array(objectId)
    .min(1)
    .max(500)
    .refine((ids) => new Set(ids).size === ids.length, 'Each item can appear only once'),
  parent: objectId.nullable().optional(),
});

export const brandSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  logo: z.string().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

const attributeValueSchema = z.object({
  value: z.string().min(1),
  colorHex: z.string().optional(),
  sortOrder: z.number().optional(),
});

export const attributeSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  type: z.enum(['color', 'text']).optional(),
  values: z.array(attributeValueSchema).optional(),
});

const imageSchema = z.object({ url: z.string(), publicId: z.string().optional() });

const variantSchema = z.object({
  sku: z.string().trim().min(1).max(64),
  attributes: z.array(z.object({ attribute: z.string(), value: z.string() })),
  price: z.number().min(0),
  compareAtPrice: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  images: z.array(imageSchema).optional(),
});

// Orders and stock changes find a variant by its SKU, so two variants of one product can't share one.
const uniqueSkus = (variants) => new Set(variants.map((v) => v.sku)).size === variants.length;

const specGroupSchema = z.object({
  groupName: z.string().min(1),
  items: z.array(z.object({ label: z.string(), value: z.string() })),
});

export const productSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().optional(),
  category: z.string().min(1),
  brand: z.string().optional(),
  productType: z.enum(['simple', 'variable']).optional(),
  description: z.string().max(50_000).optional(),
  shortHighlights: z.array(z.string()).optional(),
  images: z.array(imageSchema).optional(),
  basePrice: z.number().min(0),
  compareAtPrice: z.number().min(0).optional(),
  sku: z.string().optional(),
  stock: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  attributesUsed: z.array(z.string()).optional(),
  variants: z.array(variantSchema).refine(uniqueSkus, 'Each variant needs its own SKU').optional(),
  specifications: z.array(specGroupSchema).optional(),
  warrantyInfo: z.string().optional(),
  isFlashSale: z.boolean().optional(),
  // An ISO date-time (the admin sends one with its timezone) — or null for "no end date".
  flashSaleEndsAt: z.string().datetime({ offset: true }).nullable().optional(),
  isTrending: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  seo: z
    .object({
      metaTitle: z.string().trim().max(120, 'Keep the meta title under 120 characters').optional(),
      metaDescription: z.string().trim().max(320, 'Keep the meta description under 320 characters').optional(),
      ogImage: z
        .string()
        .trim()
        .max(500)
        .refine((v) => v === '' || /^https?:\/\//i.test(v), 'The share image must be a web link')
        .optional(),
      noIndex: z.boolean().optional(),
    })
    .optional(),
  status: z.enum(['active', 'draft', 'archived']).optional(),
});

export const productQuerySchema = z.object({
  // A comma-separated list of product ids — how the wishlist page loads exactly the products it holds.
  ids: z
    .string()
    .regex(/^[a-fA-F0-9]{24}(,[a-fA-F0-9]{24}){0,99}$/, 'ids must be a comma-separated list of product ids')
    .optional(),
  category: z.string().max(100).optional(),
  brand: z.string().max(100).optional(),
  q: z.string().trim().max(100).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  // z.coerce.boolean() would turn the text "false" into true — only the literal text "true" means true.
  inStock: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'rating', 'trending']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

/** Query for the curated storefront shelves (flash sale, trending, new arrivals, best sellers). */
export const featuredQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(60).optional(),
  sort: z.enum(['newest', 'popular', 'value']).optional(),
});

export const productAdminQuerySchema = productQuerySchema.extend({
  status: z.enum(['active', 'draft', 'archived']).optional(),
});

export const stockAdjustSchema = z.object({
  quantityChange: z
    .number()
    .int('Quantity must be a whole number')
    .refine((n) => n !== 0, 'Enter a quantity other than 0')
    .refine((n) => Math.abs(n) <= 1_000_000, 'That quantity is too large'),
  variantSku: z.string().trim().max(64).nullable().optional(),
  note: z.string().trim().max(200).optional(),
});
