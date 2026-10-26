import { useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ExternalLink, RotateCw } from 'lucide-react';
import { connectHub, connectThroughWindow, onChange, WindowNeeded } from './hub';
import { DemoExperience } from './DemoExperience';

type State = 'connecting' | 'ready' | 'window' | { failure: string };

/**
 * The demo build's outermost layer: the admin opens only once it can reach the visitor's copy of the shop. From then on,
 * anything changed elsewhere — an order placed in the store, an edit in another admin tab — refreshes what is on screen
 * (every query is refetched; the engine answers at once), and a reset reloads the page.
 */
export function DemoGate({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<State>('connecting');

  useEffect(() => {
    connectHub().then(
      () => setState('ready'),
      (err: unknown) => setState(err instanceof WindowNeeded ? 'window' : { failure: err instanceof Error ? err.message : String(err) })
    );
  }, []);

  useEffect(
    () =>
      onChange((notice, own) => {
        if (notice.reset) window.location.reload();
        else if (!own) void queryClient.invalidateQueries();
      }),
    [queryClient]
  );

  async function openWindow() {
    setState('connecting');
    try {
      await connectThroughWindow();
      setState('ready');
    } catch (err) {
      setState({ failure: err instanceof Error ? err.message : String(err) });
    }
  }

  if (state === 'ready') {
    return (
      <>
        {children}
        <DemoExperience />
      </>
    );
  }

  return (
    <div
      role={state === 'connecting' ? 'status' : 'alert'}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#16120f] px-6 text-center"
    >
      <div className="relative mb-7 flex h-16 w-16 items-center justify-center">
        {state === 'connecting' && (
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-[#d4932f]/20 border-t-[#d4932f] [animation-duration:1.1s]" />
        )}
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#6b3410] to-[#d4932f] text-lg font-black text-white">
          M
        </span>
      </div>
      {state === 'connecting' && (
        <>
          <p className="text-lg font-semibold text-[#f5efe9]">Opening the demo admin…</p>
          <p className="mt-2 max-w-sm text-sm text-[#a89a8f]">Connecting to your demo store in this browser.</p>
        </>
      )}
      {state === 'window' && (
        <>
          <p className="text-lg font-semibold text-[#f5efe9]">One click to connect your demo store</p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[#a89a8f]">
            On these addresses your browser keeps the admin and the store apart, so the admin reaches the store&apos;s data
            through a small helper window. Keep it open while you use the demo.
          </p>
          <button
            type="button"
            onClick={() => void openWindow()}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#d4932f] px-4 py-2 text-sm font-semibold text-[#1a1310] hover:bg-[#e2a548]"
          >
            <ExternalLink className="h-4 w-4" aria-hidden /> Open the helper window
          </button>
        </>
      )}
      {typeof state === 'object' && (
        <>
          <p className="text-lg font-semibold text-[#f5efe9]">The demo admin couldn&apos;t open</p>
          <p className="mt-2 max-w-sm text-sm text-[#a89a8f]">{state.failure}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#d4932f] px-4 py-2 text-sm font-semibold text-[#1a1310] hover:bg-[#e2a548]"
          >
            <RotateCw className="h-4 w-4" aria-hidden /> Try again
          </button>
        </>
      )}
    </div>
  );
}
