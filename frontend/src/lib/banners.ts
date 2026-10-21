import { apiGet } from '@/lib/api';
import { heroFallback, iconStripCategories, lifestyleBanners, promoBanners } from '@/lib/placeholder-data';
import type { Banner, BannerGroups, BannerType } from '@/types/content';

const TYPES: BannerType[] = ['hero', 'hero_side', 'promo_pair', 'promo_triple', 'category_icon'];

function emptyGroups(): BannerGroups {
  return { hero: [], hero_side: [], promo_pair: [], promo_triple: [], category_icon: [] };
}

/** The demo set shown only when the banners API can't be reached at all. */
function fallbackGroups(): BannerGroups {
  const groups = emptyGroups();
  groups.hero = [{ _id: 'fallback-hero', type: 'hero', sortOrder: 0, ...heroFallback.main }];
  groups.hero_side = [{ _id: 'fallback-hero-side', type: 'hero_side', sortOrder: 0, ...heroFallback.side }];
  groups.promo_pair = promoBanners.map((b, i) => ({ ...b, _id: b.id, type: 'promo_pair', sortOrder: i }));
  groups.promo_triple = lifestyleBanners.map((b, i) => ({ ...b, _id: b.id, type: 'promo_triple', sortOrder: i }));
  groups.category_icon = iconStripCategories.map((c, i) => ({
    _id: c.id,
    type: 'category_icon',
    title: c.name,
    image: c.image ?? '',
    ctaLink: `/category/${c.slug}`,
    sortOrder: i,
  }));
  return groups;
}

/**
 * Every banner on the homepage, grouped by placement and already in display order (the API only
 * returns banners that are active and inside their schedule).
 *
 * An empty placement stays empty — if an admin removes every promo banner they don't want the demo
 * ones back. Only when the API itself fails does the page fall back to the built-in demo set.
 */
export async function getHomeBanners(): Promise<BannerGroups> {
  const raw = await apiGet<Banner[]>('/banners', { revalidate: 60 });
  if (!raw) return fallbackGroups();

  const groups = emptyGroups();
  for (const banner of raw) {
    if (TYPES.includes(banner.type)) groups[banner.type].push(banner);
  }
  return groups;
}
