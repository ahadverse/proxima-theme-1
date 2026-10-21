import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BannerImage } from '@/components/home/BannerImage';
import { HeroSlider } from '@/components/home/HeroSlider';
import { cn } from '@/lib/cn';
import type { Banner } from '@/types/content';

function SideTile({ banner, className }: { banner: Banner; className?: string }) {
  const hasCopy = Boolean(banner.title || banner.subtitle || banner.ctaText);

  const content = (
    <>
      <BannerImage
        image={banner.image}
        mobileImage={banner.mobileImage}
        alt={banner.title}
        sizes="(min-width: 1024px) 30vw, 100vw"
      />
      <div className="relative min-h-[240px] p-8 lg:min-h-[420px]">
        {hasCopy && (
          <div className="w-fit rounded-xl bg-black/70 p-5">
            {banner.subtitle && (
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand-accent">{banner.subtitle}</p>
            )}
            {banner.title && <h2 className="mb-4 text-2xl font-extrabold leading-tight">{banner.title}</h2>}
            {banner.ctaText && (
              <span className="inline-flex items-center gap-2 rounded-lg border border-white px-5 py-2.5 text-sm font-bold transition-colors group-hover:bg-white/10">
                {banner.ctaText} <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );

  const tileClass = cn('group relative block overflow-hidden rounded-2xl text-white', className);
  return banner.ctaLink ? (
    <Link href={banner.ctaLink} className={tileClass}>
      {content}
    </Link>
  ) : (
    <div className={tileClass}>{content}</div>
  );
}

/** The top of the homepage: a rotating hero banner with an optional static tile beside it. */
export function HeroCarousel({ heroes, side }: { heroes: Banner[]; side?: Banner }) {
  if (heroes.length === 0 && !side) return null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[7fr_3fr]">
      {heroes.length > 0 && (
        // A grid wrapper, so the slider stretches to the row's height (the side tile can be taller).
        <div className={cn('grid', !side && 'lg:col-span-2')}>
          <HeroSlider banners={heroes} />
        </div>
      )}
      {side && <SideTile banner={side} className={heroes.length === 0 ? 'lg:col-span-2' : undefined} />}
    </div>
  );
}
