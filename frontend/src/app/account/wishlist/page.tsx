'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useWishlistStore } from '@/store/wishlistStore';
import { allPlaceholderProducts } from '@/lib/placeholder-data';
import { apiGet } from '@/lib/api';
import { mapProductCard, type RawProduct } from '@/lib/mappers';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import type { ProductCard as ProductCardType } from '@/types/catalog';

const OBJECT_ID = /^[a-f0-9]{24}$/i;

export default function WishlistPage() {
  const productIds = useWishlistStore((s) => s.productIds);
  const [products, setProducts] = useState<ProductCardType[] | null>(null);

  // The wishlist only stores ids, so the products themselves are loaded from the store's catalogue.
  // A product that's since been removed or taken off sale simply doesn't come back, and drops off the list.
  useEffect(() => {
    let cancelled = false;
    const realIds = productIds.filter((id) => OBJECT_ID.test(id));
    // Ids that aren't catalogue ids belong to the demo products shown while the API is unreachable.
    const demo = allPlaceholderProducts.filter((p) => productIds.includes(p.id));

    (async () => {
      const raw = realIds.length
        ? await apiGet<RawProduct[]>(`/products?ids=${realIds.join(',')}&limit=100`)
        : [];
      if (cancelled) return;
      const real = (raw ?? []).map(mapProductCard);
      // Keep the order the shopper saved them in (newest last).
      const order = new Map(productIds.map((id, i) => [id, i]));
      setProducts([...real, ...demo].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)));
    })();

    return () => {
      cancelled = true;
    };
  }, [productIds]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">My Wishlist</h1>

      {products === null && productIds.length > 0 ? (
        <ProductGrid>
          {productIds.slice(0, 8).map((id) => (
            <ProductCardSkeleton key={id} />
          ))}
        </ProductGrid>
      ) : !products || products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/15 py-16 text-center">
          <Heart className="h-10 w-10 text-white/10" />
          <p className="text-sm text-brand-text-muted">Your wishlist is empty.</p>
          <Link href="/products" className="text-sm font-semibold text-brand-accent hover:underline">
            Browse Products
          </Link>
        </div>
      ) : (
        <ProductGrid>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </ProductGrid>
      )}
    </div>
  );
}
