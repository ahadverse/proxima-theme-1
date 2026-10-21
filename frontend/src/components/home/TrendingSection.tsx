import { SeeAllLink } from './SeeAllLink';
import { ProductShelf } from './ProductShelf';
import type { ProductCard as ProductCardType } from '@/types/catalog';

export function TrendingSection({ products, isLive }: { products: ProductCardType[]; isLive: boolean }) {
  return (
    <section aria-labelledby="trending-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="trending-heading" className="text-xl font-bold text-white md:text-2xl">
          Trending Now
        </h2>
        <SeeAllLink href="/products?sort=trending" />
      </div>
      <ProductShelf
        title="Trending Now"
        endpoint="/products/trending"
        initial={products}
        tabs={
          isLive
            ? [
                { label: 'Newest', sort: 'newest' },
                { label: 'Best Seller', sort: 'popular' },
                { label: 'Best Value', sort: 'value' },
              ]
            : undefined
        }
      />
    </section>
  );
}
