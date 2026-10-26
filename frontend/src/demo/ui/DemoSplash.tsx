'use client';

import { RotateCw } from 'lucide-react';

/**
 * What shows while the visitor's copy of the shop opens (a fraction of a second; about one on a first visit, when the
 * sample shop is set up) — or why it couldn't. In the store's default colours: its own theme isn't known yet.
 */
export function DemoSplash({ failure }: { failure?: string }) {
  return (
    <div
      role={failure ? 'alert' : 'status'}
      aria-busy={!failure}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#1a1310] px-6 text-center"
    >
      <div className="relative mb-7 flex h-16 w-16 items-center justify-center">
        {!failure && (
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-[#d4932f]/20 border-t-[#d4932f] [animation-duration:1.1s]" />
        )}
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#6b3410] to-[#d4932f] text-lg font-black text-white shadow-lg shadow-[#d4932f]/20">
          M
        </span>
      </div>
      <p className="text-lg font-semibold text-[#f5efe9]">{failure ? "The demo store couldn't open" : 'Opening your demo store…'}</p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#a89a8f]">
        {failure ?? 'A private copy of the sample shop, just for you. Everything you change stays in this browser.'}
      </p>
      {failure && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#d4932f] px-4 py-2 text-sm font-semibold text-[#1a1310] transition-colors hover:bg-[#e2a548]"
        >
          <RotateCw className="h-4 w-4" aria-hidden /> Try again
        </button>
      )}
    </div>
  );
}
