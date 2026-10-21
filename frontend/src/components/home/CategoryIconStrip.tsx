import Link from 'next/link';
import { SeeAllLink } from './SeeAllLink';
import type { Banner } from '@/types/content';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

/** The "Categories" strip under the hero — one square tile per `category_icon` banner (title = label, link = target). */
export function CategoryIconStrip({ items }: { items: Banner[] }) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="categories-heading">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="categories-heading" className="text-xl font-bold text-white md:text-2xl">
          Categories
        </h2>
        <SeeAllLink href="/products" />
      </div>
      <nav aria-label="Shop by category" className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {items.map((item) => {
          const name = item.title ?? '';
          const content = (
            <>
              <div className="relative aspect-square w-full overflow-hidden rounded-xl border-2 border-brand-accent/40 bg-white text-lg font-bold text-brand-primary transition-all duration-300 group-hover:-translate-y-1 group-hover:border-brand-accent group-hover:shadow-lg motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
                {item.image ? (
                  // Decorative: the label under the tile names the link. A plain <img> because the icon can be hosted anywhere.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">{initials(name)}</span>
                )}
              </div>
              <span className="text-center text-sm font-medium text-white group-hover:text-brand-accent">{name}</span>
            </>
          );

          return item.ctaLink ? (
            <Link key={item._id} href={item.ctaLink} className="group flex min-w-0 flex-col items-center gap-2.5">
              {content}
            </Link>
          ) : (
            <div key={item._id} className="group flex min-w-0 flex-col items-center gap-2.5">
              {content}
            </div>
          );
        })}
      </nav>
    </section>
  );
}
