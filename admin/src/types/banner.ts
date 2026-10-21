export type BannerType = 'hero' | 'hero_side' | 'promo_pair' | 'promo_triple' | 'category_icon';

export interface Banner {
  _id: string;
  type: BannerType;
  title?: string;
  subtitle?: string;
  highlights: string[];
  image: string;
  mobileImage?: string;
  ctaText?: string;
  ctaLink?: string;
  sortOrder: number;
  status: 'active' | 'inactive';
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BannerInput {
  type: BannerType;
  title?: string;
  subtitle?: string;
  highlights?: string[];
  image: string;
  mobileImage?: string;
  ctaText?: string;
  ctaLink?: string;
  sortOrder?: number;
  status?: 'active' | 'inactive';
  startsAt?: string | null;
  endsAt?: string | null;
}
