import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

export function ProductGrid({
  children,
  columns = 'standard',
  className,
}: {
  children: ReactNode;
  columns?: 'standard' | 'compact';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4',
        columns === 'standard' ? 'lg:grid-cols-4' : 'lg:grid-cols-5',
        className
      )}
    >
      {children}
    </div>
  );
}
