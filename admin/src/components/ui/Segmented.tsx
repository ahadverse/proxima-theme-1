import { cn } from '@/lib/cn';

interface SegmentedProps<T extends string | number> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  /** Accessible name for the group. */
  label: string;
  className?: string;
}

/**
 * A compact either-or switch (date range, chart/table, metric). A group of toggle buttons rather
 * than an ARIA radiogroup: each is a normal Tab stop and announces whether it's pressed, with no
 * arrow-key behaviour to implement (and to get wrong).
 */
export function Segmented<T extends string | number>({ value, onChange, options, label, className }: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn('inline-flex rounded-lg bg-slate-200 p-0.5', className)}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              isActive ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
