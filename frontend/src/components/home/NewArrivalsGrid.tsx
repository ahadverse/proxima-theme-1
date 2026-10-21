'use client';

import { useState } from 'react';
import { SeeAllLink } from './SeeAllLink';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductCard } from '@/components/product/ProductCard';
import { Button } from '@/components/ui/Button';
import { apiGet } from '@/lib/api';
import { mapProductCard, type RawProduct } from '@/lib/mappers';
import type { ProductCard as ProductCardType } from '@/types/catalog';

const PAGE_SIZE = 10;

export function NewArrivalsGrid({ products: initialProducts }: { products: ProductCardType[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [isLoading, setIsLoading] = useState(false);
  // If the very first load already came up short of a full page, there's nothing more to fetch.
  const [hasMore, setHasMore] = useState(initialProducts.length >= PAGE_SIZE * 3);

  async function handleLoadMore() {
    setIsLoading(true);
    const nextLimit = products.length + PAGE_SIZE;
    const raw = await apiGet<RawProduct[]>(`/products/new-arrivals?limit=${nextLimit}`);
    setIsLoading(false);

    if (!raw) return;
    setProducts(raw.map(mapProductCard));
    if (raw.length < nextLimit) setHasMore(false);
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white md:text-2xl">New Arrivals</h2>
        <SeeAllLink href="/new-arrivals" />
      </div>
      <ProductGrid columns="compact">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </ProductGrid>
      {hasMore && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={handleLoadMore} isLoading={isLoading}>
            Load More
          </Button>
        </div>
      )}
    </section>
  );
}
