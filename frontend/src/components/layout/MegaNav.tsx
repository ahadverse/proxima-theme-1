'use client';

import { useState, type SyntheticEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, m } from 'framer-motion';
import { MotionProvider } from '@/components/ui/Motion';
import { Home, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { CategoryWithChildren } from '@/types/catalog';

const PANEL_WIDTH = 520;

function MegaNavMenu({
  categories,
  mobileOpen,
  onNavigate,
}: {
  categories: CategoryWithChildren[];
  mobileOpen: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  // Which category's sub-menu is open, and on which page — a sub-menu opened on one page is closed on the next.
  const [open, setOpen] = useState<{ id: string; path: string } | null>(null);
  const openId = open?.path === pathname ? open.id : null;
  // Offset (px) from the trigger's own left edge to the panel's left edge — computed per
  // open, not read from CSS left-0/right-0, so it's clamped against the real viewport and
  // can never overflow either edge no matter where the trigger sits (including after wrapping
  // to a second row).
  const [panelOffset, setPanelOffset] = useState(0);
  const [mobileExpanded, setMobileExpanded] = useState<Set<string>>(new Set());

  // Opens on hover and on keyboard focus, so the sub-menus are reachable without a mouse.
  function handleEnter(e: SyntheticEvent<HTMLDivElement>, id: string) {
    const rect = e.currentTarget.getBoundingClientRect();
    const margin = 16;
    const maxLeft = Math.max(margin, window.innerWidth - PANEL_WIDTH - margin);
    const clampedLeft = Math.min(Math.max(rect.left, margin), maxLeft);
    setPanelOffset(clampedLeft - rect.left);
    setOpen({ id, path: pathname });
  }

  function close(id: string) {
    setOpen((current) => (current?.id === id ? null : current));
  }

  function toggleMobile(id: string) {
    setMobileExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    // Continues the header's dark block and rounds off its bottom edge, so the two read as one bar.
    <div className="bg-brand-bg-dark lg:rounded-b-3xl lg:pb-3 lg:shadow-lg lg:shadow-black/30">
      <nav aria-label="Main" className="mx-auto hidden max-w-[1400px] items-center gap-4 px-6 lg:flex">
        <Link
          href="/"
          aria-current={isHome ? 'page' : undefined}
          className="brand-gradient flex h-12 shrink-0 items-center gap-2 rounded-lg px-5 text-sm font-bold text-white transition-[filter] hover:brightness-125"
        >
          <Home className="h-4 w-4" aria-hidden />
          HOME
        </Link>
        <span aria-hidden className="h-10 w-px shrink-0 bg-white/15" />

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 rounded-xl bg-brand-surface-dark p-1.5">
          {categories.map((cat) => {
            const isOpen = openId === cat.id;
            return (
              <div
                key={cat.id}
                className="relative"
                onMouseEnter={(e) => handleEnter(e, cat.id)}
                onMouseLeave={() => close(cat.id)}
                onFocus={(e) => handleEnter(e, cat.id)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) close(cat.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') close(cat.id);
                }}
              >
                <Link
                  href={`/category/${cat.slug}`}
                  aria-current={pathname === `/category/${cat.slug}` ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-1 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-brand-text-on-dark transition-colors hover:bg-white/10 hover:text-white',
                    isOpen ? 'bg-white/10' : 'bg-white/5'
                  )}
                >
                  {cat.name}
                  {cat.children.length > 0 && (
                    <ChevronDown
                      aria-hidden
                      className={cn('h-3.5 w-3.5 opacity-60 transition-transform', isOpen && 'rotate-180')}
                    />
                  )}
                </Link>

                <AnimatePresence>
                  {cat.children.length > 0 && isOpen && (
                    <m.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.16, ease: 'easeOut' }}
                      style={{ left: panelOffset }}
                      className="absolute top-full z-30 grid max-h-[70vh] w-[520px] max-w-[calc(100vw-2rem)] grid-cols-2 gap-x-4 gap-y-0.5 overflow-y-auto rounded-xl border border-white/10 bg-brand-surface-dark p-3 shadow-xl"
                    >
                      {cat.children.map((child) => (
                        <Link
                          key={child.id}
                          href={`/category/${child.slug}`}
                          className="truncate rounded-md px-2.5 py-1.5 text-sm text-brand-text-on-dark transition-colors hover:bg-white/5 hover:text-brand-accent"
                        >
                          {child.name}
                        </Link>
                      ))}
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Collapsed, it's `inert` — still in the page for the open/close animation, but out of the tab
          order and invisible to screen readers (links inside a zero-height box are otherwise focusable). */}
      <nav
        id="mobile-nav"
        aria-label="Main (mobile)"
        inert={!mobileOpen}
        className={cn(
          'flex flex-col overflow-hidden overflow-y-auto border-t border-white/10 transition-[max-height] duration-300 lg:hidden',
          mobileOpen ? 'max-h-[70vh]' : 'max-h-0 border-t-0'
        )}
      >
        <Link
          href="/"
          onClick={onNavigate}
          aria-current={isHome ? 'page' : undefined}
          className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white"
        >
          <Home className="h-4 w-4" aria-hidden />
          HOME
        </Link>
        {categories.map((cat) => {
          const expanded = mobileExpanded.has(cat.id);
          return (
            <div key={cat.id} className="border-t border-white/5 first:border-t-0">
              <div className="flex items-center">
                <Link
                  href={`/category/${cat.slug}`}
                  onClick={onNavigate}
                  aria-current={pathname === `/category/${cat.slug}` ? 'page' : undefined}
                  className="flex-1 px-5 py-3 text-sm font-semibold text-brand-text-on-dark"
                >
                  {cat.name}
                </Link>
                {cat.children.length > 0 && (
                  <button
                    type="button"
                    aria-label={`${expanded ? 'Collapse' : 'Expand'} ${cat.name}`}
                    aria-expanded={expanded}
                    onClick={() => toggleMobile(cat.id)}
                    className="flex h-10 w-12 shrink-0 items-center justify-center text-brand-text-on-dark"
                  >
                    <ChevronDown aria-hidden className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
                  </button>
                )}
              </div>
              {cat.children.length > 0 && expanded && (
                <div className="flex flex-col bg-black/20 pb-1">
                  {cat.children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/category/${child.slug}`}
                      onClick={onNavigate}
                      className="px-8 py-2 text-sm text-brand-text-on-dark"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

/** The header's category menu. It sits in the layout, outside any route template, so it carries its own Motion provider. */
export function MegaNav(props: {
  categories: CategoryWithChildren[];
  mobileOpen: boolean;
  onNavigate?: () => void;
}) {
  return (
    <MotionProvider>
      <MegaNavMenu {...props} />
    </MotionProvider>
  );
}
