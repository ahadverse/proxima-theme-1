import { formatBDT } from '@/lib/currency';
import { cn } from '@/lib/cn';

export function Price({
  price,
  compareAtPrice,
  size = 'md',
  className,
  priceClassName = 'text-brand-primary',
  compareClassName = 'text-slate-500',
}: {
  price: number;
  compareAtPrice?: number | null;
  size?: 'sm' | 'md' | 'card' | 'lg';
  className?: string;
  /** Override the price's own color — e.g. `text-brand-accent` when shown directly on a dark panel. */
  priceClassName?: string;
  /** Override the struck-through price's color — it needs a lighter shade than the default to stay readable on a dark panel. */
  compareClassName?: string;
}) {
  const hasDiscount = Boolean(compareAtPrice && compareAtPrice > price);

  const sizeClasses = {
    sm: { price: 'text-sm', compare: 'text-xs' },
    md: { price: 'text-base', compare: 'text-sm' },
    card: { price: 'text-lg', compare: 'text-base' },
    lg: { price: 'text-2xl', compare: 'text-base' },
  }[size];

  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-2', className)}>
      {hasDiscount && (
        <span className={cn('line-through', compareClassName, sizeClasses.compare)}>
          {formatBDT(compareAtPrice!)}
        </span>
      )}
      <span className={cn('font-bold', priceClassName, sizeClasses.price)}>
        {formatBDT(price)}
      </span>
    </span>
  );
}
