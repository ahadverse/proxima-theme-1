'use client';

import { cn } from '@/lib/cn';

/** A row of toggle buttons that picks how a shelf is ordered. Controlled: the shelf owns which one is active. */
export function SectionTabs<T extends string>({
  label,
  tabs,
  active,
  onChange,
}: {
  /** Names the group for assistive tech, e.g. "Sort flash sale". */
  label: string;
  tabs: { label: string; value: T }[];
  active: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex w-fit flex-wrap items-center gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          aria-pressed={active === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'rounded-lg px-5 py-2.5 text-sm font-semibold transition-all active:scale-95 motion-reduce:transition-none',
            active === tab.value
              ? 'bg-white text-slate-900 shadow-sm'
              : 'bg-brand-accent/80 text-brand-bg-dark hover:bg-brand-accent'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
