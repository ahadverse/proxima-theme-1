import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Badge({
  children,
  variant = 'discount',
  className,
}: {
  children: ReactNode;
  variant?: 'discount' | 'new' | 'muted';
  className?: string;
}) {
  const variants = {
    discount: 'bg-red-600 text-white',
    new: 'brand-gradient text-white',
    muted: 'bg-slate-100 text-slate-600',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
