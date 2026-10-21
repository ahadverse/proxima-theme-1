import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-slate-200', className)} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <Skeleton className="mb-3 aspect-square w-full rounded-lg" />
      <Skeleton className="mb-2 h-4 w-3/4" />
      <Skeleton className="mb-3 h-4 w-1/2" />
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}
