import { SeeAllLink } from './SeeAllLink';
import { CountdownTimer } from './CountdownTimer';
import { ProductShelf } from './ProductShelf';
import type { ProductCard as ProductCardType } from '@/types/catalog';

/**
 * When the sale that's about to end does: the earliest end date among the products, if any has one.
 * (The API already leaves out sales that have ended, so there's no need to read the clock here.)
 */
function nextEnd(products: ProductCardType[]): string | null {
  const ends = products
    .map((p) => (p.flashSaleEndsAt ? new Date(p.flashSaleEndsAt).getTime() : NaN))
    .filter((t) => Number.isFinite(t));
  return ends.length ? new Date(Math.min(...ends)).toISOString() : null;
}

export function FlashSaleSection({ products, isLive }: { products: ProductCardType[]; isLive: boolean }) {
  // The countdown only appears when the sale really has an end date — never a clock that restarts per visit.
  const endsAt = isLive ? nextEnd(products) : null;

  return (
    <section aria-labelledby="flash-sale-heading" className="brand-gradient rounded-2xl p-5 md:p-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <h2 id="flash-sale-heading" className="text-xl font-bold text-white md:text-2xl">
            Flash Sale
          </h2>
          {endsAt && <CountdownTimer endsAt={endsAt} />}
        </div>
        <SeeAllLink href="/deals" />
      </div>
      <ProductShelf
        title="Flash Sale"
        endpoint="/products/flash-sale"
        initial={products}
        tabs={
          isLive
            ? [
                { label: 'Newest', sort: 'newest' },
                { label: 'Popular', sort: 'popular' },
              ]
            : undefined
        }
      />
    </section>
  );
}
