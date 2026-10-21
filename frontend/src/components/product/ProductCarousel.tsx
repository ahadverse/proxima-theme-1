'use client';

import { useCallback, useSyncExternalStore } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import type { EmblaCarouselType } from 'embla-carousel';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

/** A value read from the carousel that re-renders the component whenever the carousel moves or re-measures. */
function useEmblaValue<T extends string | number | boolean>(
  emblaApi: EmblaCarouselType | undefined,
  read: (api: EmblaCarouselType) => T,
  serverValue: T
): T {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!emblaApi) return () => {};
      emblaApi.on('select', onChange).on('reInit', onChange);
      return () => {
        emblaApi.off('select', onChange).off('reInit', onChange);
      };
    },
    [emblaApi]
  );
  return useSyncExternalStore(
    subscribe,
    () => (emblaApi ? read(emblaApi) : serverValue),
    () => serverValue
  );
}

export function ProductCarousel({ children, label = 'Products' }: { children: ReactNode[]; label?: string }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', dragFree: true, slidesToScroll: 2 });
  const selectedIndex = useEmblaValue(emblaApi, (api) => api.selectedScrollSnap(), 0);
  const snapCount = useEmblaValue(emblaApi, (api) => api.scrollSnapList().length, 0);
  const canPrev = useEmblaValue(emblaApi, (api) => api.canScrollPrev(), false);
  const canNext = useEmblaValue(emblaApi, (api) => api.canScrollNext(), false);

  return (
    <div className="relative" role="region" aria-roledescription="carousel" aria-label={label}>
      {/* The padding (cancelled by the negative margins) leaves room for a card's hover lift and shadow inside the clipped viewport. */}
      <div className="-mt-2 mb-[-1rem] overflow-hidden px-0 pb-4 pt-2" ref={emblaRef}>
        <div className="-ml-3 flex md:-ml-4">
          {children.map((child, i) => (
            <div key={i} className="min-w-0 shrink-0 grow-0 basis-1/2 pl-3 sm:basis-1/3 md:pl-4 lg:basis-1/5">
              {child}
            </div>
          ))}
        </div>
      </div>

      {canPrev && (
        <button
          type="button"
          aria-label="Previous products"
          onClick={() => emblaApi?.scrollPrev()}
          className="absolute -left-3 top-1/3 z-10 hidden h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md hover:bg-slate-50 md:flex"
        >
          <ChevronLeft className="h-4 w-4 text-brand-primary" aria-hidden />
        </button>
      )}
      {canNext && (
        <button
          type="button"
          aria-label="Next products"
          onClick={() => emblaApi?.scrollNext()}
          className="absolute -right-3 top-1/3 z-10 hidden h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md hover:bg-slate-50 md:flex"
        >
          <ChevronRight className="h-4 w-4 text-brand-primary" aria-hidden />
        </button>
      )}

      {snapCount > 1 && (
        <div className="mt-2 flex justify-center">
          {Array.from({ length: snapCount }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === selectedIndex ? 'true' : undefined}
              onClick={() => emblaApi?.scrollTo(i)}
              // The button is the 24px tap target; the pill inside is what's drawn.
              className="group flex h-6 w-6 items-center justify-center"
            >
              <span
                aria-hidden
                className={cn(
                  'block h-1.5 rounded-full transition-all',
                  i === selectedIndex ? 'w-5 bg-brand-accent' : 'w-1.5 bg-white/40 group-hover:bg-white/70'
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
