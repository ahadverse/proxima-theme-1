'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, User, ShoppingBag, Heart, Menu, X } from 'lucide-react';
import { useCartCount, useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { MegaNav } from './MegaNav';
import type { CategoryWithChildren } from '@/types/catalog';

function SearchBox({
  query,
  onQueryChange,
  className,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex h-12 w-full items-center rounded-xl bg-white/10 pl-1 transition-colors focus-within:bg-white/15 focus-within:ring-1 focus-within:ring-brand-accent">
        <button
          type="submit"
          aria-label="Search"
          className="flex h-10 w-10 shrink-0 items-center justify-center text-white transition-colors hover:text-brand-accent"
        >
          <Search className="h-5 w-5" aria-hidden />
        </button>
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          type="search"
          enterKeyHint="search"
          maxLength={100}
          placeholder="Search for Products..."
          aria-label="Search products"
          className="h-full w-full bg-transparent pr-3 text-[15px] text-white placeholder:text-brand-text-muted focus:outline-none"
        />
      </div>
    </div>
  );
}

// The shop's main destinations, shown beside the logo on wide screens (the footer carries them everywhere else).
const primaryLinks = [
  { label: 'All Products', href: '/products' },
  { label: 'All Brands', href: '/brands' },
  { label: 'Deals & Offers', href: '/deals' },
  { label: 'New Arrivals', href: '/new-arrivals' },
];

// A square, outlined icon button — the account, wishlist and cart controls.
const iconButton =
  'relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/15 md:h-12 md:w-12';

export function Header({
  storeName,
  logo,
  categories,
}: {
  storeName: string;
  /** The store's logo image (Settings → Store in the admin); the name is shown as text when there isn't one. */
  logo?: string;
  categories: CategoryWithChildren[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const cartCount = useCartCount();
  const openCart = useCartStore((s) => s.openCart);
  const wishlistCount = useWishlistStore((s) => s.productIds.length);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    router.push(query.trim() ? `/products?q=${encodeURIComponent(query.trim())}` : '/products');
  }

  return (
    <>
      <header className="bg-brand-bg-dark">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-3 md:px-6 md:py-4">
          <button
            type="button"
            className="text-white lg:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
          </button>

          <Link href="/" className="shrink-0">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- the logo can be hosted anywhere and its shape isn't known
              <img src={logo} alt={storeName} className="h-9 w-auto max-w-[180px] object-contain md:h-11" />
            ) : (
              <span className="text-2xl font-extrabold tracking-tight text-gradient md:text-3xl">{storeName}</span>
            )}
          </Link>

          <nav aria-label="Primary" className="ml-6 hidden shrink-0 items-center gap-6 text-sm font-medium text-white xl:flex">
            {primaryLinks.map((l) => (
              <Link key={l.href} href={l.href} className="transition-colors hover:text-brand-accent">
                {l.label}
              </Link>
            ))}
          </nav>

          <form onSubmit={handleSearch} role="search" aria-label="Search the store" className="hidden flex-1 md:flex">
            <SearchBox query={query} onQueryChange={setQuery} className="w-full" />
          </form>

          <div className="ml-auto flex items-center gap-2 md:gap-3">
            <Link
              href="/account"
              aria-label="Account"
              className={iconButton}
            >
              <User className="h-5 w-5" aria-hidden />
            </Link>
            <Link
              href="/account/wishlist"
              aria-label={wishlistCount > 0 ? `Wishlist, ${wishlistCount} ${wishlistCount === 1 ? 'item' : 'items'}` : 'Wishlist'}
              className={iconButton}
            >
              <Heart className="h-5 w-5" aria-hidden />
              {wishlistCount > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-accent text-[10px] font-bold text-black"
                >
                  {wishlistCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={openCart}
              aria-label={cartCount > 0 ? `Cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}` : 'Cart'}
              className={iconButton}
            >
              <ShoppingBag className="h-5 w-5" aria-hidden />
              {cartCount > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-accent text-[10px] font-bold text-black"
                >
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <form onSubmit={handleSearch} role="search" aria-label="Search the store" className="px-4 pb-3 md:hidden">
          <SearchBox query={query} onQueryChange={setQuery} />
        </form>
      </header>

      {/* Sibling of the header block (not nested in it) so its containing block spans the
          whole page — position: sticky only holds an element within its own parent's box,
          and the header block alone is too short for this to stay pinned past it. */}
      <div className="sticky top-0 z-40">
        <Suspense fallback={<div className="hidden h-[72px] rounded-b-3xl bg-brand-bg-dark lg:block" />}>
          <MegaNav categories={categories} mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
        </Suspense>
      </div>
    </>
  );
}
