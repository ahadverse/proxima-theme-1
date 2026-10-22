import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductCardSkeleton, Skeleton } from '@/components/ui/Skeleton';

/**
 * The loading state of a product listing (all products, a category, a brand): breadcrumb, heading, the filter card on a
 * phone / the sidebar on a large screen, the count + sort row and a grid of cards. It takes the room the real page takes,
 * so when the products arrive nothing is pushed around — a skeleton with only a heading and some cards made the whole
 * grid jump down by the height of everything it left out.
 */
export function ListingSkeleton({ withFilters = true }: { withFilters?: boolean }) {
  return (
    <div role="status" aria-busy="true" className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
      <span className="sr-only">Loading products…</span>
      <Skeleton className="mb-5 h-4 w-48 bg-white/10" />
      <Skeleton className="mb-6 h-8 w-56 bg-white/10 md:h-10" />
      <div className={withFilters ? 'flex flex-col gap-8 lg:flex-row' : undefined}>
        {withFilters && <Skeleton className="h-[180px] w-full shrink-0 rounded-xl bg-white/10 lg:h-96 lg:w-72" />}
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-24 bg-white/10" />
            <Skeleton className="h-[38px] w-40 bg-white/10" />
          </div>
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
