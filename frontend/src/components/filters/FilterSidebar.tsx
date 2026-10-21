'use client';

import { type FormEvent, useId, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/cn';
import { ChevronUp, ChevronDown, Minus, Plus, Search, SlidersHorizontal } from 'lucide-react';

interface FilterOption {
  name: string;
  slug: string;
}

function FilterGroup({
  title,
  children,
  defaultOpen = true,
  scrollable = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  /** A long list (every category or brand) scrolls inside its group instead of stretching the sidebar. */
  scrollable?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <div className="border-b border-slate-200 py-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between text-sm font-bold text-slate-900"
      >
        {title}
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-primary/10 text-brand-primary">
          {open ? <Minus className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
        </span>
      </button>
      <div
        id={panelId}
        role="group"
        aria-label={title}
        hidden={!open}
        className={cn('mt-3 space-y-2.5', scrollable && 'max-h-56 overflow-y-auto pr-1')}
      >
        {children}
      </div>
    </div>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
  ariaLabel,
  children,
}: {
  label?: string;
  checked: boolean;
  onChange: () => void;
  ariaLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700 hover:text-slate-950">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={ariaLabel}
        className="h-4 w-4 rounded border-slate-300 bg-white text-brand-primary focus:ring-brand-primary"
      />
      {label}
      {children}
    </label>
  );
}

interface FilterValues {
  q: string;
  category: string;
  brand: string;
  minPrice: string;
  maxPrice: string;
  rating: string;
  inStock: boolean;
}

function FilterForm({
  categories,
  brands,
  initial,
}: {
  categories: FilterOption[];
  brands: FilterOption[];
  initial: FilterValues;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial.q);
  const [category, setCategory] = useState(initial.category);
  const [brand, setBrand] = useState(initial.brand);
  const [minPrice, setMinPrice] = useState(initial.minPrice);
  const [maxPrice, setMaxPrice] = useState(initial.maxPrice);
  const [rating, setRating] = useState(initial.rating);
  const [inStock, setInStock] = useState(initial.inStock);
  // On a phone the filters start folded away so the products aren't pushed a screen down.
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeCount = [category, brand, minPrice, maxPrice, rating].filter(Boolean).length + (inStock ? 1 : 0);

  function applyFilters(e?: FormEvent) {
    e?.preventDefault();
    const params = new URLSearchParams();
    // A reversed range ("from 5000 to 1000") is what the shopper obviously meant the other way round.
    let min = minPrice;
    let max = maxPrice;
    if (min && max && Number(min) > Number(max)) [min, max] = [max, min];

    if (q.trim()) params.set('q', q.trim());
    if (category) params.set('category', category);
    if (brand) params.set('brand', brand);
    if (min) params.set('minPrice', min);
    if (max) params.set('maxPrice', max);
    if (rating) params.set('rating', rating);
    if (inStock) params.set('inStock', 'true');
    const qs = params.toString();
    router.push(qs ? `/products?${qs}` : '/products');
  }

  function resetFilters() {
    setQ('');
    setCategory('');
    setBrand('');
    setMinPrice('');
    setMaxPrice('');
    setRating('');
    setInStock(false);
    router.push('/products');
  }

  const priceInput =
    'w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-brand-primary focus:outline-none';

  return (
    <aside aria-label="Product filters" className="w-full shrink-0 lg:w-72 lg:self-start">
      <form onSubmit={applyFilters} className="rounded-xl bg-white p-5 text-slate-900">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Search Products</h2>
        <div role="search" aria-label="Search within these results" className="mb-3 flex overflow-hidden rounded-lg border border-slate-300 bg-white">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find your product..."
            aria-label="Search products"
            maxLength={100}
            className="w-full px-3 py-2 text-sm text-slate-900 focus:outline-none"
          />
          <button type="submit" aria-label="Search" className="brand-gradient px-3 text-white">
            <Search className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
          aria-controls="filter-panels"
          className="mb-1 flex w-full items-center justify-between rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-900 lg:hidden"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters
            {activeCount > 0 && (
              <span className="rounded-full bg-brand-primary px-2 py-0.5 text-xs font-bold text-white">
                {activeCount}
              </span>
            )}
          </span>
          {mobileOpen ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
        </button>

        <div id="filter-panels" className={mobileOpen ? 'block' : 'hidden lg:block'}>
          {categories.length > 0 && (
            <FilterGroup title="Categories" scrollable>
              {categories.map((c) => (
                <CheckRow
                  key={c.slug}
                  label={c.name}
                  checked={category === c.slug}
                  onChange={() => setCategory(category === c.slug ? '' : c.slug)}
                />
              ))}
            </FilterGroup>
          )}

          {brands.length > 0 && (
            <FilterGroup title="Brand" scrollable>
              {brands.map((b) => (
                <CheckRow
                  key={b.slug}
                  label={b.name}
                  checked={brand === b.slug}
                  onChange={() => setBrand(brand === b.slug ? '' : b.slug)}
                />
              ))}
            </FilterGroup>
          )}

          <FilterGroup title="Price Range">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Min"
                aria-label="Minimum price"
                className={priceInput}
              />
              <span className="text-slate-500" aria-hidden>
                —
              </span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Max"
                aria-label="Maximum price"
                className={priceInput}
              />
            </div>
          </FilterGroup>

          <FilterGroup title="Average Rating">
            {[5, 4, 3, 2, 1].map((n) => (
              <CheckRow
                key={n}
                checked={rating === String(n)}
                onChange={() => setRating(rating === String(n) ? '' : String(n))}
                ariaLabel={n === 5 ? '5 stars' : `${n} stars and up`}
              >
                <span aria-hidden className="flex text-brand-primary">
                  {'★'.repeat(n)}
                  <span className="text-slate-300">{'★'.repeat(5 - n)}</span>
                </span>
                {n < 5 && (
                  <span aria-hidden className="ml-auto text-xs text-slate-500">
                    &amp; Up
                  </span>
                )}
              </CheckRow>
            ))}
          </FilterGroup>

          <FilterGroup title="Stock Status">
            <CheckRow label="In stock only" checked={inStock} onChange={() => setInStock((v) => !v)} />
          </FilterGroup>

          <div className="mt-5 space-y-2">
            <button type="submit" className="brand-gradient w-full rounded-lg py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.99]">
              Apply Filter
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="w-full rounded-lg border border-slate-300 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50"
            >
              Reset All
            </button>
          </div>
        </div>
      </form>
    </aside>
  );
}

// Filtering always navigates to /products — clicking a category/brand here jumps there
// (rather than preserving a pretty /category/[slug] URL) so the same component works
// identically wherever it's rendered. `defaults` is what's pre-ticked on a page whose URL
// already says which category or brand it is.
export function FilterSidebar({
  categories,
  brands,
  defaults,
}: {
  categories: FilterOption[];
  brands: FilterOption[];
  defaults?: { category?: string; brand?: string };
}) {
  const searchParams = useSearchParams();

  const initial: FilterValues = {
    q: searchParams.get('q') ?? '',
    category: searchParams.get('category') ?? defaults?.category ?? '',
    brand: searchParams.get('brand') ?? defaults?.brand ?? '',
    minPrice: searchParams.get('minPrice') ?? '',
    maxPrice: searchParams.get('maxPrice') ?? '',
    rating: searchParams.get('rating') ?? '',
    inStock: searchParams.get('inStock') === 'true',
  };

  // Keyed by the URL: when it changes underneath (the header search box, a link, back/forward), the
  // form starts over from what the URL says instead of holding on to what was typed before.
  return (
    <FilterForm
      key={`${searchParams.toString()}|${defaults?.category ?? ''}|${defaults?.brand ?? ''}`}
      categories={categories}
      brands={brands}
      initial={initial}
    />
  );
}
