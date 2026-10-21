import mongoose from 'mongoose';

/**
 * Homepage banners. `type` is the placement:
 *   hero          the large rotating banner at the top (as many as you like)
 *   hero_side     the single static tile beside it
 *   promo_pair    two-across promo banners under Flash Sale
 *   promo_triple  three-across lifestyle banners above the trust badges
 *   category_icon the round icon strip under the hero (title = label, ctaLink = where it goes)
 */
export const BANNER_TYPES = ['hero', 'hero_side', 'promo_pair', 'promo_triple', 'category_icon'];

const bannerSchema = new mongoose.Schema(
  {
    type: { type: String, enum: BANNER_TYPES, required: true },
    title: { type: String },
    subtitle: { type: String },
    // Short bullet points shown on a hero banner ("0% EMI", "5% Instant Discount", ...).
    highlights: [{ type: String }],
    image: { type: String, required: true },
    mobileImage: { type: String },
    ctaText: { type: String },
    ctaLink: { type: String },
    sortOrder: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    startsAt: { type: Date },
    endsAt: { type: Date },
  },
  { timestamps: true }
);

bannerSchema.index({ type: 1, sortOrder: 1 });

export const Banner = mongoose.model('Banner', bannerSchema);
