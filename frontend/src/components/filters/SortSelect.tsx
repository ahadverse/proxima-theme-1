'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SORT_OPTIONS } from '@/lib/listing';

/** Re-sorts the listing it sits on, keeping its filters and going back to the first page. */
export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const requested = searchParams.get('sort');
  const current = SORT_OPTIONS.some((o) => o.value === requested) ? requested! : 'newest';

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'newest') params.delete('sort');
    else params.set('sort', value);
    params.delete('page');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <label className="flex items-center gap-2 text-sm text-brand-text-muted">
      <span className="shrink-0">Sort by</span>
      <select
        value={current}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-lg border border-white/15 bg-brand-surface-dark px-3 py-2 text-sm text-white focus:border-brand-accent focus:outline-none"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
