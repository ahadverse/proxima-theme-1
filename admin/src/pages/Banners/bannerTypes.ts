import type { Banner, BannerType } from '@/types/banner';

interface BannerTypeInfo {
  label: string;
  /** Where it appears on the storefront. */
  where: string;
  /** What the storefront does while the placement has no live banner. */
  whenEmpty: string;
  /** A good upload size — the storefront crops to fit, so this is a guide, not a rule. */
  size: string;
  tone: 'blue' | 'amber' | 'slate';
}

export const BANNER_TYPE_INFO: Record<BannerType, BannerTypeInfo> = {
  hero: {
    label: 'Hero carousel',
    where: 'The large banner at the top of the homepage. Add several and they rotate.',
    whenEmpty: 'With neither a carousel nor a side tile, the top row is not shown. A side tile alone fills the whole row.',
    size: '1280 × 560 px',
    tone: 'blue',
  },
  hero_side: {
    label: 'Hero side tile',
    where: 'The single tile beside the hero carousel. Without one, the carousel spans the full width.',
    whenEmpty: 'Optional — the carousel simply spans the full width.',
    size: '640 × 560 px',
    tone: 'blue',
  },
  promo_pair: {
    label: 'Promo pair',
    where: 'Two banners side by side, under Flash Sale.',
    whenEmpty: 'This row is not shown on the homepage.',
    size: '960 × 440 px',
    tone: 'amber',
  },
  promo_triple: {
    label: 'Lifestyle trio',
    where: 'Three banners in a row, just above the trust badges.',
    whenEmpty: 'This row is not shown on the homepage.',
    size: '640 × 800 px',
    tone: 'amber',
  },
  category_icon: {
    label: 'Category icon',
    where: 'The square icon tiles in the "Categories" strip under the hero. The title is its label; the link is where it goes.',
    whenEmpty: 'The Categories strip is not shown on the homepage.',
    size: '200 × 200 px',
    tone: 'slate',
  },
};

/** The homepage section a placement belongs to, listed top to bottom in the order they appear on the storefront. */
export interface BannerSection {
  key: string;
  title: string;
  /** Where on the page, in a few words. */
  description: string;
  types: BannerType[];
}

export const BANNER_SECTIONS: BannerSection[] = [
  { key: 'hero', title: 'Hero', description: 'Top of the homepage', types: ['hero', 'hero_side'] },
  { key: 'categories', title: 'Category strip', description: 'Under the hero', types: ['category_icon'] },
  { key: 'flash-sale', title: 'Flash Sale promos', description: 'Under the Flash Sale', types: ['promo_pair'] },
  { key: 'lifestyle', title: 'Lifestyle', description: 'Bottom of the homepage, above the trust badges', types: ['promo_triple'] },
];

/** Every placement, grouped section by section in page order. */
export const BANNER_TYPES = BANNER_SECTIONS.flatMap((section) => section.types);

export const sectionOf = (type: BannerType) => BANNER_SECTIONS.find((section) => section.types.includes(type));


function shortDate(ms: number) {
  return new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Whether a banner is on the storefront right now, and if not, why not. */
export function bannerState(banner: Banner, now = Date.now()) {
  if (banner.status === 'inactive') return { label: 'Inactive', tone: 'slate' as const, detail: '' };

  const starts = banner.startsAt ? new Date(banner.startsAt).getTime() : null;
  const ends = banner.endsAt ? new Date(banner.endsAt).getTime() : null;

  if (starts && starts > now) return { label: 'Scheduled', tone: 'blue' as const, detail: `from ${shortDate(starts)}` };
  if (ends && ends < now) return { label: 'Expired', tone: 'red' as const, detail: `ended ${shortDate(ends)}` };
  return { label: 'Live', tone: 'green' as const, detail: ends ? `until ${shortDate(ends)}` : '' };
}

/** ISO timestamp -> the "YYYY-MM-DDTHH:mm" (local time) a datetime-local input wants. */
export function toLocalInput(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The reverse: a datetime-local value (local time) -> ISO, or null when left blank. */
export function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}
