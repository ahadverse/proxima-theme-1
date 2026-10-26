'use client';

import { useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useDialog } from '@/hooks/useDialog';
import { demoRequest } from '../client/hub';
import { HAS_DEMO_ADMIN } from '../config';

/** "Start again with the sample shop" — every change made in this browser goes, in every tab and in the admin. */
export function ResetDialog({ onClose }: { onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  useDialog(panel, onClose);

  async function reset() {
    setBusy(true);
    await demoRequest('POST', '/__demo/reset');
    // Every tab reloads on the reset notice; this one too, to be sure.
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
        className="w-full max-w-sm rounded-2xl bg-white p-6 text-slate-700 shadow-2xl"
      >
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <RotateCcw className="h-5 w-5" aria-hidden />
        </span>
        <h2 id="demo-reset-title" className="text-lg font-bold text-slate-900">
          Reset the demo store?
        </h2>
        <p className="mt-2 text-sm leading-relaxed">
          The sample shop comes back exactly as it started — your orders, products, settings and sign-ins in this browser are
          cleared{HAS_DEMO_ADMIN ? ', in the store and in the admin' : ''}.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={busy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
          >
            {busy ? 'Resetting…' : 'Reset demo'}
          </button>
        </div>
      </div>
    </div>
  );
}
