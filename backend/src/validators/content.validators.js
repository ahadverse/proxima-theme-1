import { z } from 'zod';
import { BANNER_TYPES } from '../models/Banner.js';

const paging = {
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
};

// ---------- FAQ

export const faqSchema = z.object({
  question: z.string().trim().min(1, 'Question is required').max(300),
  answer: z.string().trim().min(1, 'Answer is required').max(5000),
  sortOrder: z.number().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

// ---------- Banners

// Banner links end up in an <a href>, so only same-site paths and http(s) addresses are allowed
// (never javascript: and friends).
const linkSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v === '' || (v.startsWith('/') && !v.startsWith('//')) || /^https?:\/\/\S+$/i.test(v),
    'Use a path like /category/phones or a full https:// address'
  );

const optionalDate = z.string().datetime({ offset: true }).nullable().optional();

const bannerBase = z.object({
  type: z.enum(BANNER_TYPES),
  title: z.string().trim().max(120).optional(),
  subtitle: z.string().trim().max(160).optional(),
  highlights: z.array(z.string().trim().min(1).max(80)).max(6).optional(),
  image: z.string().trim().min(1, 'Image is required'),
  mobileImage: z.string().trim().optional(),
  ctaText: z.string().trim().max(40).optional(),
  ctaLink: linkSchema.optional(),
  sortOrder: z.number().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  startsAt: optionalDate,
  endsAt: optionalDate,
});

const endsAfterStart = [
  (v) => !v.startsAt || !v.endsAt || new Date(v.endsAt) > new Date(v.startsAt),
  { message: 'The end must come after the start', path: ['endsAt'] },
];

export const bannerSchema = bannerBase.refine(...endsAfterStart);
export const bannerUpdateSchema = bannerBase.partial().refine(...endsAfterStart);

export const bannerQuerySchema = z.object({ type: z.enum(BANNER_TYPES).optional() });
export const bannerAdminQuerySchema = z.object({
  type: z.enum(BANNER_TYPES).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

// ---------- Blog

// Lower-case words joined by hyphens. 'manage' is the admin list's address, so it can't be a post.
const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only')
  .refine((v) => v !== 'manage', 'That address is reserved');

const seoSchema = z.object({
  metaTitle: z.string().trim().max(120).optional(),
  metaDescription: z.string().trim().max(320).optional(),
});

const blogBase = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  slug: slugSchema.optional(),
  excerpt: z.string().trim().max(400).optional(),
  content: z.string().min(1, 'Content is required').max(100_000),
  coverImage: z.string().trim().optional(),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(40)).max(12).optional(),
  status: z.enum(['draft', 'published']).optional(),
  seo: seoSchema.optional(),
});

export const blogSchema = blogBase;
export const blogUpdateSchema = blogBase.partial();

export const blogPublicQuerySchema = z.object({
  tag: z.string().trim().toLowerCase().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const blogAdminQuerySchema = z.object({
  status: z.enum(['draft', 'published']).optional(),
  q: z.string().trim().optional(),
  ...paging,
});

// ---------- Static pages

const pageBase = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1, 'Title is required').max(160),
  content: z.string().min(1, 'Write something for the page first').max(100_000),
  // Sent as 'html' by the admin's rich text editor. Left out, a new page is Markdown and an edited page
  // keeps the format it already has.
  contentFormat: z.enum(['markdown', 'html']).optional(),
});

export const pageSchema = pageBase;
export const pageUpdateSchema = pageBase.partial();
