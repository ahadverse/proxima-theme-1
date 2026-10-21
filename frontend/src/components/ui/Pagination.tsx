import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Page numbers worth showing: the first, the last, and the pages around the current one, with gaps marked. */
function pageWindow(page: number, pages: number): (number | 'gap')[] {
  const wanted = [1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages);
  const sorted = [...new Set(wanted)].sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push('gap');
    out.push(n);
  });
  return out;
}

const cell =
  'flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition-colors';

/**
 * Previous / numbered / next links for a server-rendered listing. `params` are the listing's current
 * query params (filters, sort) — they're carried across pages, with `page` added or replaced.
 */
export function Pagination({
  basePath,
  params,
  page,
  pages,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  pages: number;
}) {
  if (pages <= 1) return null;

  function hrefFor(n: number) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== 'page') query.set(key, value);
    }
    if (n > 1) query.set('page', String(n));
    const qs = query.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const idle = 'border-white/15 text-brand-text-on-dark hover:border-brand-accent hover:text-white';

  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={cn(cell, idle)}>
          <ChevronLeft className="h-4 w-4" aria-hidden /> Prev
        </Link>
      ) : (
        <span aria-disabled="true" className={cn(cell, 'cursor-not-allowed border-white/10 text-white/50')}>
          <ChevronLeft className="h-4 w-4" aria-hidden /> Prev
        </span>
      )}

      {pageWindow(page, pages).map((item, i) =>
        item === 'gap' ? (
          <span key={`gap-${i}`} aria-hidden className="px-1 text-brand-text-muted">
            …
          </span>
        ) : item === page ? (
          <span key={item} aria-current="page" className={cn(cell, 'brand-gradient border-transparent text-white')}>
            {item}
          </span>
        ) : (
          <Link key={item} href={hrefFor(item)} aria-label={`Page ${item}`} className={cn(cell, idle)}>
            {item}
          </Link>
        )
      )}

      {page < pages ? (
        <Link href={hrefFor(page + 1)} rel="next" className={cn(cell, idle)}>
          Next <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <span aria-disabled="true" className={cn(cell, 'cursor-not-allowed border-white/10 text-white/50')}>
          Next <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      )}
    </nav>
  );
}
