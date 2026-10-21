'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label,
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  /** What's being counted (a product's name) — makes each stepper's buttons distinguishable when there are several on a page. */
  label?: string;
  className?: string;
}) {
  const of = label ? ` of ${label}` : '';

  return (
    <div className={cn('inline-flex items-center rounded-lg border border-slate-200 bg-white', className)}>
      <button
        type="button"
        aria-label={`Decrease quantity${of}`}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex h-9 w-9 items-center justify-center text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
      >
        <Minus className="h-3.5 w-3.5" aria-hidden />
      </button>
      <span
        role="status"
        aria-label={`Quantity${of}: ${value}`}
        className="flex h-9 w-10 items-center justify-center text-sm font-semibold text-slate-900"
      >
        {value}
      </span>
      <button
        type="button"
        aria-label={`Increase quantity${of}`}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-9 w-9 items-center justify-center text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
