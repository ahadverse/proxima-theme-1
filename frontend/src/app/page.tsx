import { HeroCarousel } from '@/components/home/HeroCarousel';
import { CategoryIconStrip } from '@/components/home/CategoryIconStrip';
import { FlashSaleSection } from '@/components/home/FlashSaleSection';
import { TrendingSection } from '@/components/home/TrendingSection';
import { BrandStrip } from '@/components/home/BrandStrip';
import { NewArrivalsGrid } from '@/components/home/NewArrivalsGrid';
import { PromoBanners } from '@/components/home/PromoBanners';
import { TrustBadges } from '@/components/home/TrustBadges';
import { Reveal } from '@/components/ui/Reveal';
import { apiGet } from '@/lib/api';
import { getHomeBanners } from '@/lib/banners';
import { mapBrand, mapProductCard, type RawProduct } from '@/lib/mappers';
import { getPublicSettings } from '@/lib/settings';
import {
  brandStrip,
  flashSaleProducts as placeholderFlashSale,
  trendingProducts as placeholderTrending,
  newArrivals as placeholderNewArrivals,
  trustBadges,
} from '@/lib/placeholder-data';
import type { BrandSummary, ProductCard } from '@/types/catalog';

interface Shelf {
  products: ProductCard[];
  /** False when the demo products are standing in for an unreachable API. */
  isLive: boolean;
}

/**
 * One curated shelf. The demo products appear only when the API can't be reached; a store that
 * hasn't flagged anything for a shelf gets an empty one (which the page leaves out), not demo goods.
 */
async function getShelf(
  type: 'flash-sale' | 'trending' | 'new-arrivals',
  demo: ProductCard[],
  limit?: number
): Promise<Shelf> {
  const qs = limit ? `?limit=${limit}` : '';
  const raw = await apiGet<RawProduct[]>(`/products/${type}${qs}`, { revalidate: 60 });
  return raw ? { products: raw.map(mapProductCard), isLive: true } : { products: demo, isLive: false };
}

async function getBrands(): Promise<BrandSummary[]> {
  const raw = await apiGet<Parameters<typeof mapBrand>[0][]>('/brands', { revalidate: 300 });
  return raw ? raw.map(mapBrand).slice(0, 14) : brandStrip;
}

export default async function Home() {
  const [flashSale, trending, newArrivals, brands, banners, settings] = await Promise.all([
    getShelf('flash-sale', placeholderFlashSale),
    getShelf('trending', placeholderTrending),
    getShelf('new-arrivals', placeholderNewArrivals, 30),
    getBrands(),
    getHomeBanners(),
    getPublicSettings(),
  ]);

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-12 px-4 py-6 md:gap-14 md:px-6 md:py-8">
      <h1 className="sr-only">{settings.seo.metaTitle || settings.storeName}</h1>
      {/* The hero and the category strip are above the fold, so they're never held back; every section
          below them rises into view as it's scrolled to (see Reveal). */}
      <HeroCarousel heroes={banners.hero} side={banners.hero_side[0]} />
      <CategoryIconStrip items={banners.category_icon} />
      {flashSale.products.length > 0 && (
        <Reveal>
          <FlashSaleSection products={flashSale.products} isLive={flashSale.isLive} />
        </Reveal>
      )}
      {banners.promo_pair.length > 0 && (
        <Reveal>
          <PromoBanners banners={banners.promo_pair} columns={2} />
        </Reveal>
      )}
      {trending.products.length > 0 && (
        <Reveal>
          <TrendingSection products={trending.products} isLive={trending.isLive} />
        </Reveal>
      )}
      {brands.length > 0 && (
        <Reveal>
          <BrandStrip brands={brands} />
        </Reveal>
      )}
      {newArrivals.products.length > 0 && (
        <Reveal>
          <NewArrivalsGrid products={newArrivals.products} />
        </Reveal>
      )}
      {banners.promo_triple.length > 0 && (
        <Reveal>
          <PromoBanners banners={banners.promo_triple} columns={3} />
        </Reveal>
      )}
      <Reveal>
        <TrustBadges badges={trustBadges} />
      </Reveal>
    </div>
  );
}
