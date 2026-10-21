import { z } from 'zod';

// Theme colours end up in CSS custom properties on both apps, so only real hex colours are accepted.
const hexColor = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a hex colour like #6b3410');
const themeSchema = z
  .object({
    bgDark: hexColor,
    surfaceDark: hexColor,
    primary: hexColor,
    primaryDark: hexColor,
    accent: hexColor,
    gradientFrom: hexColor,
    gradientTo: hexColor,
    card: hexColor,
    textOnDark: hexColor,
    textMuted: hexColor,
  })
  .partial();

// Footer links end up as <a href> on every storefront page, so only a site path or a plain web / mail / phone
// link is accepted — never javascript: or a protocol-relative //host.
const footerHref = z
  .string()
  .trim()
  .min(1, 'A link needs an address')
  .max(300)
  .refine((v) => /^(\/(?!\/)|https?:\/\/|mailto:|tel:)/i.test(v), 'Use a page path like /about, or a full link like https://…');
const footerSchema = z.object({
  sections: z
    .array(
      z.object({
        title: z.string().trim().min(1, 'Every section needs a title').max(60),
        links: z
          .array(z.object({ label: z.string().trim().min(1, 'Every link needs a name').max(80), href: footerHref }))
          .max(30),
      })
    )
    .max(8),
});

const weight = z.number().min(0).max(1);

// Credentials are free text (the admin form sends a masked value back unchanged when a secret wasn't edited).
const credential = z.string().trim().max(2000);
const courierMode = z.enum(['sandbox', 'live']);
const parcelWeightKg = z.number().min(0.5, 'Weight is between 0.5 and 10 kg').max(10, 'Weight is between 0.5 and 10 kg');

// Printed straight into the storefront's pages, so only the exact shapes Google issues are accepted.
const googleId = (pattern, message) => z.string().trim().refine((v) => v === '' || pattern.test(v), message);

const googleTagSchema = z
  .object({
    analyticsId: googleId(/^G-[A-Z0-9]{4,20}$/, 'A Google Analytics 4 Measurement ID looks like G-XXXXXXXXXX'),
    adsId: googleId(/^AW-\d{6,15}$/, 'A Google Ads Conversion ID looks like AW-123456789'),
    adsPurchaseLabel: googleId(/^[A-Za-z0-9_-]{6,40}$/, 'A conversion label is letters, numbers, - and _'),
  })
  .partial();

const courierSchema = z
  .object({
    defaultProvider: z.enum(['', 'steadfast', 'pathao', 'carrybee']),
    steadfast: z.object({ enabled: z.boolean(), mode: courierMode, apiKey: credential, secretKey: credential }).partial(),
    pathao: z
      .object({
        enabled: z.boolean(),
        mode: courierMode,
        clientId: credential,
        clientSecret: credential,
        username: credential,
        password: credential,
        storeId: z.string().trim().regex(/^\d*$/, 'The Pathao store ID is a number'),
        defaultWeight: parcelWeightKg,
      })
      .partial(),
    carrybee: z
      .object({
        enabled: z.boolean(),
        mode: courierMode,
        clientId: credential,
        clientSecret: credential,
        clientContext: credential,
        storeId: credential,
        defaultWeight: parcelWeightKg,
      })
      .partial(),
  })
  .partial();

// Deliberately loose/partial — Settings is a large nested document and the admin UI
// only ever sends the section(s) it's editing. Deep validation of credential shapes
// happens implicitly (missing fields just mean isConfigured() stays false).
export const updateSettingsSchema = z
  .object({
    storeName: z.string().optional(),
    logo: z.string().optional(),
    hotlinePhone: z.string().optional(),
    supportEmail: z.string().optional(),
    storeLocations: z.array(z.object({ label: z.string(), address: z.string(), phone: z.string() })).optional(),
    socialLinks: z.object({}).catchall(z.string()).optional(),
    deliveryCharges: z
      .object({ insideDhaka: z.number().min(0).optional(), outsideDhaka: z.number().min(0).optional() })
      .optional(),
    paymentGateways: z.object({}).catchall(z.any()).optional(),
    courier: courierSchema.optional(),
    facebookPixel: z.object({}).catchall(z.any()).optional(),
    googleTag: googleTagSchema.optional(),
    fraud: z
      .object({
        thirdPartyProvider: z.string(),
        thirdPartyApiKey: z.string(),
        thirdPartyEnabled: z.boolean(),
        internalWeight: weight,
        externalWeight: weight,
      })
      .partial()
      .optional(),
    theme: themeSchema.optional(),
    footer: footerSchema.optional(),
    seo: z.object({}).catchall(z.string()).optional(),
  })
  .partial();
