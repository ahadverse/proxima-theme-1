// Query-string helpers shared by the listing pages and the client-side sort control.
// Kept free of heavier imports so the client bundle doesn't pull in the catalogue loaders.

/** Reads a `?page=` value: a whole number from 1 up, anything else means the first page. */
export function parsePage(value: string | string[] | undefined): number {
  const n = typeof value === 'string' ? Number.parseInt(value, 10) : 1;
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 10_000) : 1;
}

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'trending', label: 'Best Selling' },
] as const;

/** A `?sort=` value the API understands, or undefined for the default (newest). */
export function parseSort(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' && SORT_OPTIONS.some((o) => o.value === value && o.value !== 'newest')
    ? value
    : undefined;
}
