import Link from 'next/link';
import { SeeAllLink } from './SeeAllLink';

export function BrandStrip({ brands }: { brands: { id: string; name: string; slug: string; logo?: string }[] }) {
  return (
    <section aria-labelledby="brands-heading">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="brands-heading" className="text-xl font-bold text-white md:text-2xl">
          Shop by Brand
        </h2>
        <SeeAllLink href="/brands" />
      </div>
      <div className="rounded-2xl bg-brand-bg-dark p-3 md:p-4">
        <div className="grid grid-cols-3 items-start gap-3 sm:grid-cols-4 md:grid-cols-7">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brand/${brand.slug}`}
              className="group flex min-w-0 flex-col items-center gap-2 text-center"
            >
              <span className="flex h-20 w-full items-center justify-center rounded-xl bg-white px-3 text-sm font-bold text-slate-700 transition-all duration-300 group-hover:-translate-y-1 group-hover:text-brand-primary group-hover:shadow-lg motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 md:h-24">
                {brand.logo ? (
                  // The logo can be hosted anywhere and its shape isn't known, hence a plain <img>; the name below labels the link.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brand.logo} alt="" loading="lazy" decoding="async" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="truncate">{brand.name}</span>
                )}
              </span>
              {/* With a logo the name goes underneath; without one the tile already says it. */}
              {brand.logo && (
                <span className="w-full truncate text-xs text-brand-text-muted group-hover:text-brand-accent">{brand.name}</span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
