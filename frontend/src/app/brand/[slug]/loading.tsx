import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductCardSkeleton, Skeleton } from '@/components/ui/Skeleton';

// Shown while the brand's products load, so the page doesn't sit blank.
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
      <span className="sr-only">Loading products…</span>
      <Skeleton className="mb-6 h-8 w-56 bg-white/10" />
      <ProductGrid>
        {Array.from({ length: 8 }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </ProductGrid>
    </div>
  );
}
