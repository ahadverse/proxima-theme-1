import Link from 'next/link';
import { BannerImage } from '@/components/home/BannerImage';
import { cn } from '@/lib/cn';
import type { Banner } from '@/types/content';

export function PromoBanners({ banners, columns = 2 }: { banners: Banner[]; columns?: 2 | 3 }) {
  if (banners.length === 0) return null;

  return (
    <div className={cn('grid grid-cols-1 gap-4', columns === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3')}>
      {banners.map((banner) => {
        const hasCopy = Boolean(banner.title || banner.subtitle || banner.ctaText);
        // The pair is a wide 16:9 banner each; the triple is tall, portrait-style — like the reference design.
        const className = cn(
          'group relative flex min-h-[220px] flex-col justify-end overflow-hidden rounded-2xl p-5 text-white md:p-7',
          columns === 2 ? 'md:aspect-[16/9]' : 'md:aspect-[3/4]'
        );

        const content = (
          <>
            <BannerImage
              image={banner.image}
              mobileImage={banner.mobileImage}
              alt={banner.title}
              sizes={columns === 2 ? '(min-width: 768px) 50vw, 100vw' : '(min-width: 768px) 33vw, 100vw'}
              className="transition-transform duration-300 group-hover:scale-105"
            />
            {hasCopy && (
              <div className="relative inline-flex w-fit flex-col items-start rounded-xl bg-black/70 p-4">
                {banner.subtitle && <p className="mb-1 text-sm font-medium text-white/90">{banner.subtitle}</p>}
                {banner.title && (
                  <h3 className={cn('text-2xl font-extrabold leading-tight', banner.ctaText && 'mb-3')}>
                    {banner.title}
                  </h3>
                )}
                {banner.ctaText && (
                  <span className="inline-flex w-fit items-center rounded-lg bg-white px-4 py-2 text-xs font-bold text-black transition-transform group-hover:scale-105">
                    {banner.ctaText}
                  </span>
                )}
              </div>
            )}
          </>
        );

        return banner.ctaLink ? (
          <Link key={banner._id} href={banner.ctaLink} className={className}>
            {content}
          </Link>
        ) : (
          <div key={banner._id} className={className}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
