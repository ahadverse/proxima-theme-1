import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Compass, ListChecks, MoreHorizontal, RotateCcw, ShoppingBag } from 'lucide-react';
import { useDialog } from '@/hooks/useDialog';
import { DEMO_CTA_LABEL, DEMO_CTA_URL, DEMO_STORE_URL } from './config';
import { openChecklist, openTour } from './events';
import { demoRequest } from './hub';

// No display class in here: the pills that hide on a phone say `hidden md:inline-flex`, and a base `inline-flex` would win over
// `hidden` (it comes later in the stylesheet), so they would never hide and the bar would be wider than the screen.
const pill =
  'h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300';

/**
 * The demo's slim bar above the admin: what this is, the jump to the store (same browser, same data), the guide, the
 * checklist, a reset and the way to buy it. The same bar the demo store shows, in the same fixed colours.
 */
export function DemoBar({ floating = false }: { floating?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menu.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  return (
    <aside
      aria-label="Demo admin"
      className={`${floating ? 'fixed inset-x-0 top-0' : 'relative shrink-0'} z-50 border-b border-white/5 bg-[#101014] text-white`}
    >
      <div className="flex h-11 items-center gap-3 px-4 sm:px-6">
        <span className="inline-flex shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
          </span>
          Live demo
        </span>
        <p className="hidden min-w-0 truncate text-xs text-white/60 lg:block">
          Demo admin — everything works, and everything stays in this browser.
        </p>

        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={openTour} className={`${pill} hidden text-white/80 hover:bg-white/10 md:inline-flex`}>
            <Compass className="h-3.5 w-3.5" aria-hidden /> Guide
          </button>
          <button type="button" onClick={openChecklist} className={`${pill} hidden text-white/80 hover:bg-white/10 md:inline-flex`}>
            <ListChecks className="h-3.5 w-3.5" aria-hidden /> Try it
          </button>
          <button type="button" onClick={() => setResetting(true)} className={`${pill} hidden text-white/80 hover:bg-white/10 md:inline-flex`}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset
          </button>
          {DEMO_CTA_URL && (
            <a href={DEMO_CTA_URL} target="_blank" rel="noopener" className={`${pill} hidden bg-amber-400 text-[#1c1100] hover:bg-amber-300 sm:inline-flex`}>
              <ShoppingBag className="h-3.5 w-3.5" aria-hidden /> {DEMO_CTA_LABEL}
            </a>
          )}
          <a href={DEMO_STORE_URL} target="_blank" rel="noopener" data-demo="open-store" className={`${pill} inline-flex bg-white text-[#16161a] hover:bg-amber-100`}>
            Open store <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </a>

          <div ref={menu} className="relative md:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label="More demo options"
              className={`${pill} inline-flex px-2 text-white/80 hover:bg-white/10`}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#1c1c22] py-1 text-sm shadow-2xl">
                {[
                  { label: 'Guided tour', icon: Compass, action: openTour },
                  { label: 'Try it checklist', icon: ListChecks, action: openChecklist },
                  { label: 'Reset the demo', icon: RotateCcw, action: () => setResetting(true) },
                ].map(({ label, icon: Icon, action }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      action();
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-white/85 hover:bg-white/5"
                  >
                    <Icon className="h-4 w-4 text-amber-300" aria-hidden /> {label}
                  </button>
                ))}
                {DEMO_CTA_URL && (
                  <a href={DEMO_CTA_URL} target="_blank" rel="noopener" className="flex items-center gap-2.5 px-4 py-2.5 font-semibold text-amber-300 hover:bg-white/5">
                    <ShoppingBag className="h-4 w-4" aria-hidden /> {DEMO_CTA_LABEL}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {resetting && <ResetDialog onClose={() => setResetting(false)} />}
    </aside>
  );
}

/** "Start again with the sample shop" — every change made in this browser goes, in the admin and in the store. */
function ResetDialog({ onClose }: { onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  useDialog(panel, onClose);

  async function reset() {
    setBusy(true);
    await demoRequest('POST', '/__demo/reset');
    window.location.reload();
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-reset-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-slate-100 p-6 text-slate-700 shadow-2xl ring-1 ring-slate-200"
      >
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-amber-400/15 text-amber-500">
          <RotateCcw className="h-5 w-5" aria-hidden />
        </span>
        <h2 id="demo-reset-title" className="text-lg font-bold text-slate-900">
          Reset the demo store?
        </h2>
        <p className="mt-2 text-sm leading-relaxed">
          The sample shop comes back exactly as it started — your orders, products, settings and sign-ins in this browser are
          cleared, in the admin and in the store.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void reset()}
            disabled={busy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-50 hover:bg-slate-800 disabled:opacity-60"
          >
            {busy ? 'Resetting…' : 'Reset demo'}
          </button>
        </div>
      </div>
    </div>
  );
}
