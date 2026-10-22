import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-slate-200', className)} />;
}

/** Same outline as ProductCard (picture, two-line title, price, button row), so the cards that replace it fit exactly. */
export function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-100 bg-white">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-7 w-1/2" />
        <div className="mt-auto flex items-center gap-2 pt-1">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        </div>
      </div>
    </div>
  );
}
