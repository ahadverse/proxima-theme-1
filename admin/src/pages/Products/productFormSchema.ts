import { z } from 'zod';

const imageSchema = z.object({ url: z.string(), publicId: z.string().optional() });

const variantAttributeSchema = z.object({ attribute: z.string(), value: z.string() });

const variantSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  attributes: z.array(variantAttributeSchema),
  price: z.coerce.number().min(0, 'Price must be 0 or more'),
  compareAtPrice: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().min(0).optional(),
  lowStockThreshold: z.coerce.number().min(0).optional(),
  images: z.array(imageSchema).optional().default([]),
});

const specItemSchema = z.object({
  label: z.string().min(1, 'Required'),
  value: z.string().min(1, 'Required'),
});
const specGroupSchema = z.object({
  groupName: z.string().min(1, 'Group name is required'),
  items: z.array(specItemSchema),
});

// shortHighlights is string[] on the backend — useFieldArray needs objects, so the form holds
// { text: string }[] and ProductForm converts to/from string[] at load/submit time.
export const productFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  brand: z.string().optional(),
  productType: z.enum(['simple', 'variable']),
  description: z.string().optional(),
  shortHighlights: z.array(z.object({ text: z.string().min(1, 'Required') })).default([]),
  images: z.array(imageSchema).default([]),
  basePrice: z.coerce.number().min(0, 'Price must be 0 or more'),
  compareAtPrice: z.coerce.number().min(0).optional(),
  sku: z.string().optional(),
  stock: z.coerce.number().min(0).optional(),
  lowStockThreshold: z.coerce.number().min(0).optional(),
  attributesUsed: z.array(z.string()).default([]),
  variants: z.array(variantSchema).default([]),
  specifications: z.array(specGroupSchema).default([]),
  warrantyInfo: z.string().optional(),
  isFlashSale: z.boolean().optional(),
  flashSaleEndsAt: z.string().optional(),
  isTrending: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  seoMetaTitle: z.string().trim().max(120, 'Keep it under 120 characters').optional(),
  seoMetaDescription: z.string().trim().max(320, 'Keep it under 320 characters').optional(),
  seoOgImage: z.string().optional(),
  seoNoIndex: z.boolean().optional(),
  status: z.enum(['active', 'draft', 'archived']),
});

// z.coerce.number() fields have an input type of `unknown` (pre-parse) and output `number`
// (post-parse) — useForm must be typed with the input shape, onSubmit's handler receives output.
export type ProductFormValues = z.input<typeof productFormSchema>;
export type ProductFormOutput = z.output<typeof productFormSchema>;

export const emptyProductFormValues: ProductFormValues = {
  title: '',
  slug: '',
  category: '',
  brand: '',
  productType: 'simple',
  description: '',
  shortHighlights: [],
  images: [],
  basePrice: 0,
  compareAtPrice: undefined,
  sku: '',
  stock: 0,
  lowStockThreshold: 5,
  attributesUsed: [],
  variants: [],
  specifications: [],
  warrantyInfo: '',
  isFlashSale: false,
  flashSaleEndsAt: '',
  isTrending: false,
  isBestSeller: false,
  isNewArrival: false,
  isFeatured: false,
  seoMetaTitle: '',
  seoMetaDescription: '',
  seoOgImage: '',
  seoNoIndex: false,
  status: 'active',
};
