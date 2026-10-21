import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductCardSkeleton, Skeleton } from '@/components/ui/Skeleton';

// Shown while the listing's products load, so the page doesn't sit blank.
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
      <span className="sr-only">Loading products…</span>
      <Skeleton className="mb-6 h-8 w-56 bg-white/10" />
      <div className="flex flex-col gap-8 lg:flex-row">
        <Skeleton className="hidden h-96 w-64 shrink-0 bg-white/10 lg:block" />
        <div className="flex-1">
          <ProductGrid>
            {Array.from({ length: 8 }, (_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </ProductGrid>
        </div>
      </div>
    </div>
  );
}
