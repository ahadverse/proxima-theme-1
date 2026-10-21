'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { BannerImage } from '@/components/home/BannerImage';
import { cn } from '@/lib/cn';
import type { Banner } from '@/types/content';

const ROTATE_MS = 6000;

function HeroSlide({ banner, isFirst, isActive }: { banner: Banner; isFirst: boolean; isActive: boolean }) {
  const highlights = banner.highlights ?? [];
  const hasCopy = Boolean(banner.title || banner.subtitle || highlights.length > 0 || banner.ctaText);
  // Only one h1 on the page — later slides (hidden until they rotate in) are h2s.
  const Heading = isFirst ? 'h1' : 'h2';

  const content = (
    <>
      <BannerImage
        image={banner.image}
        mobileImage={banner.mobileImage}
        alt={banner.title}
        sizes="(min-width: 1024px) 66vw, 100vw"
        priority={isFirst}
      />
      <div className="relative min-h-[300px] p-8 lg:min-h-[420px] lg:p-12">
        {hasCopy && (
          // Settles in a beat after its slide fades up. `initial={false}`: the first slide is already in place
          // in the server's HTML (it's the page's LCP) and must not start hidden.
          <m.div
            initial={false}
            animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 14 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: isActive ? 0.2 : 0 }}
            className="w-fit max-w-md rounded-xl bg-black/70 p-5"
          >
            {banner.subtitle && (
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-white/90">{banner.subtitle}</p>
            )}
            {banner.title && (
              <Heading className="mb-4 text-3xl font-extrabold leading-tight md:text-4xl lg:text-5xl">
                {banner.title}
              </Heading>
            )}
            {highlights.length > 0 && (
              <ul className="mb-6 flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium text-white">
                {highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            )}
            {banner.ctaText && (
              <span className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-bold text-black transition-transform group-hover:scale-105 motion-reduce:transition-none">
                {banner.ctaText} <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </m.div>
        )}
      </div>
    </>
  );

  const className = 'group relative block';
  return banner.ctaLink ? (
    <Link href={banner.ctaLink} className={className} tabIndex={isActive ? 0 : -1}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

/**
 * The large rotating banner. Every slide sits in the same grid cell, so the box is as tall as the
 * tallest slide and nothing jumps as they cross-fade. With a single banner it's just a static image.
 */
export function HeroSlider({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // If banners are removed while someone is on a later slide, don't point past the end.
  const active = index < banners.length ? index : 0;

  useEffect(() => {
    if (banners.length < 2 || isPaused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % banners.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [banners.length, isPaused]);

  return (
    <div className="relative">
      <div
        className="relative grid overflow-hidden rounded-2xl text-white"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
      >
        {banners.map((banner, i) => (
          <m.div
            key={banner._id}
            inert={i !== active}
            aria-hidden={i !== active}
            // Cross-fades and settles from a slight zoom. Nothing animates on first paint (`initial={false}`),
            // so slide one is simply there; and `prefers-reduced-motion` drops the zoom (the page's MotionConfig).
            initial={false}
            animate={{ opacity: i === active ? 1 : 0, scale: i === active ? 1 : 1.04 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className={cn('relative col-start-1 row-start-1', i !== active && 'pointer-events-none')}
          >
            <HeroSlide banner={banner} isFirst={i === 0} isActive={i === active} />
          </m.div>
        ))}
      </div>

      {banners.length > 1 && (
        // Over the picture on a phone; beneath it, on the dark page, from `lg`.
        <div className="absolute inset-x-0 bottom-1 z-10 flex justify-center lg:-bottom-9">
          {banners.map((banner, i) => (
            <button
              key={banner._id}
              type="button"
              aria-label={`Show banner ${i + 1} of ${banners.length}`}
              aria-current={i === active}
              onClick={() => setIndex(i)}
              // The button is the 24px tap target; the pill inside is what's drawn.
              className="group flex h-6 w-6 items-center justify-center"
            >
              <span
                aria-hidden
                className={cn(
                  'block h-2 rounded-full transition-all',
                  i === active
                    ? 'w-6 bg-white lg:bg-brand-accent'
                    : 'w-2 bg-white/60 group-hover:bg-white lg:bg-white/40 lg:group-hover:bg-white/70'
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
