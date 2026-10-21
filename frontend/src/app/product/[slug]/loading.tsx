import { Skeleton } from '@/components/ui/Skeleton';

// Shown while the product loads, so the page doesn't sit blank.
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
      <span className="sr-only">Loading product…</span>
      <Skeleton className="mb-5 h-4 w-64 bg-white/10" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-xl bg-white/10" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-24 bg-white/10" />
          <Skeleton className="h-9 w-3/4 bg-white/10" />
          <Skeleton className="h-28 w-full rounded-xl bg-white/10" />
          <Skeleton className="h-10 w-full bg-white/10" />
          <Skeleton className="h-12 w-full bg-white/10" />
        </div>
      </div>
    </div>
  );
}
