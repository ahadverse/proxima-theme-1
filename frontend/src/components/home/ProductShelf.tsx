'use client';

import { useState } from 'react';
import { m } from 'framer-motion';
import { ProductCarousel } from '@/components/product/ProductCarousel';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import { apiGet } from '@/lib/api';
import { mapProductCard, type RawProduct } from '@/lib/mappers';
import { SectionTabs } from './SectionTabs';
import type { ProductCard as ProductCardType } from '@/types/catalog';

export type ShelfSort = 'newest' | 'popular' | 'value';

export interface ShelfTab {
  label: string;
  sort: ShelfSort;
}

const SHELF_SIZE = 10;

/**
 * A carousel of products with tabs that re-order it (newest, most bought, biggest markdown). The
 * newest-first products arrive with the page; each other tab is fetched the first time it's opened.
 * Without `tabs` — demo products standing in for an unreachable API — it's just the carousel.
 */
export function ProductShelf({
  title,
  endpoint,
  initial,
  tabs,
}: {
  /** The shelf's heading, e.g. "Flash Sale" — names the carousel and its tab group for assistive tech. */
  title: string;
  /** The API route the shelf is served from, e.g. `/products/trending`. */
  endpoint: string;
  initial: ProductCardType[];
  tabs?: ShelfTab[];
}) {
  const [active, setActive] = useState<ShelfSort>('newest');
  const [bySort, setBySort] = useState<Partial<Record<ShelfSort, ProductCardType[]>>>({ newest: initial });
  const [loading, setLoading] = useState<ShelfSort | null>(null);
  const [failed, setFailed] = useState(false);
  // False until a tab has been clicked: the products that arrive with the page appear at once, not faded in.
  const [hasSwitched, setHasSwitched] = useState(false);

  async function open(sort: ShelfSort) {
    setHasSwitched(true);
    setActive(sort);
    setFailed(false);
    if (bySort[sort]) return;

    setLoading(sort);
    const raw = await apiGet<RawProduct[]>(`${endpoint}?sort=${sort}&limit=${SHELF_SIZE}`);
    setLoading((current) => (current === sort ? null : current));
    if (!raw) {
      setFailed(true);
      return;
    }
    setBySort((prev) => ({ ...prev, [sort]: raw.map(mapProductCard) }));
  }

  const items = bySort[active];

  return (
    <>
      {tabs && tabs.length > 1 && (
        <div className="mb-4">
          <SectionTabs
            label={`Sort ${title}`}
            active={active}
            onChange={(sort) => void open(sort)}
            tabs={tabs.map((t) => ({ label: t.label, value: t.sort }))}
          />
        </div>
      )}

      {items ? (
        // Each tab's products fade in (the page's first render, with `initial={false}`, is left as it is).
        <m.div
          key={active}
          initial={hasSwitched ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <ProductCarousel label={title}>
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </ProductCarousel>
        </m.div>
      ) : failed ? (
        <div role="alert" className="flex items-center gap-3 rounded-xl bg-black/25 px-4 py-6 text-sm text-white">
          Couldn&apos;t load these products.
          <button type="button" onClick={() => void open(active)} className="font-semibold underline">
            Try again
          </button>
        </div>
      ) : (
        <div aria-busy={loading !== null} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}
    </>
  );
}
