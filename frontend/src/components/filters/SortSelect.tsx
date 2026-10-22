'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { SORT_OPTIONS } from '@/lib/listing';

/** Re-sorts the listing it sits on, keeping its filters and going back to the first page. */
export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The new order comes from the server, and the old list stays on screen until it arrives — without this the select
  // gives no sign that anything is happening for the second or so a phone connection takes.
  const [isPending, startTransition] = useTransition();

  const requested = searchParams.get('sort');
  const current = SORT_OPTIONS.some((o) => o.value === requested) ? requested! : 'newest';

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'newest') params.delete('sort');
    else params.set('sort', value);
    params.delete('page');
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm text-brand-text-muted" aria-busy={isPending}>
      <span className="shrink-0">Sort by</span>
      {/* A fixed-size slot, so the spinner appearing doesn't nudge the select sideways. */}
      <span className="flex h-4 w-4 shrink-0 items-center justify-center" role="status">
        {isPending && (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span className="sr-only">Updating results…</span>
          </>
        )}
      </span>
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
