import type { PublicSettings } from '@/types/settings';

/**
 * Shown on the live sales demo only: visitors must never mistake it for a real shop, and it is where
 * we point them at buying the theme. Fixed colours rather than theme ones, so it stays readable and
 * stands out whatever palette the demo is showing.
 */
export function DemoBanner({ cta }: { cta?: PublicSettings['demoCta'] }) {
  return (
    <aside aria-label="Demo notice" className="bg-amber-300 px-4 py-2 text-center text-sm font-medium text-[#1c1100]">
      <span>Demo store — nothing here is real. Orders and payments are simulated, and everything resets every night.</span>
      {cta?.url && (
        <a
          href={cta.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-3 inline-block rounded-md bg-[#1c1100] px-3 py-0.5 font-semibold text-[#fde68a] hover:bg-black"
        >
          {cta.label || 'Get this store'}
        </a>
      )}
    </aside>
  );
}
