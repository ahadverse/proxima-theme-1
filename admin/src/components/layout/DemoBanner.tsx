import { usePublicSettings } from '@/api/settings';

/** Shown on the live sales demo only — what visitors do here is simulated and wiped every night. */
export function DemoBanner({ floating = false }: { floating?: boolean }) {
  const { data: settings } = usePublicSettings();
  if (!settings?.isDemo) return null;
  const cta = settings.demoCta;

  return (
    <aside aria-label="Demo notice" className={`${floating ? 'fixed inset-x-0 top-0 z-50' : 'shrink-0'} bg-amber-300 px-4 py-2 text-center text-sm font-medium text-[#1c1100]`}>
      <span>Demo admin — nothing here is real. Orders and payments are simulated, and everything resets every night.</span>
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
