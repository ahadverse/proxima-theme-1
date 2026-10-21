/** Admin-managed content (GET /banners, /pages/:slug, /blog). */

export type BannerType = 'hero' | 'hero_side' | 'promo_pair' | 'promo_triple' | 'category_icon';

export interface Banner {
  _id: string;
  type: BannerType;
  title?: string;
  subtitle?: string;
  highlights?: string[];
  image: string;
  mobileImage?: string;
  ctaText?: string;
  ctaLink?: string;
  sortOrder: number;
}

export type BannerGroups = Record<BannerType, Banner[]>;

export interface CmsPageData {
  slug: string;
  title: string;
  content: string;
  /** How `content` is written: Markdown (older pages) or the HTML the rich text editor produces. */
  contentFormat?: 'markdown' | 'html';
  updatedAt: string;
}
