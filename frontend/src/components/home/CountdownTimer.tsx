'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';

// One shared once-a-second clock for every timer on the page. Reading `Date.now()` happens only in the
// client's subscribe/tick — never while rendering — so the server render and hydration agree.
let nowSeconds = 0;

function subscribe(onChange: () => void) {
  const tick = () => {
    nowSeconds = Math.floor(Date.now() / 1000);
    onChange();
  };
  tick();
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}

const getSnapshot = () => nowSeconds;
const getServerSnapshot = () => null;

const pad = (n: number) => String(n).padStart(2, '0');

/** Counts down to `endsAt` — the real end of the flash sale, not a made-up clock that restarts on every visit. */
export function CountdownTimer({ endsAt }: { endsAt: string }) {
  const router = useRouter();
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const target = Math.floor(new Date(endsAt).getTime() / 1000);
  const left = now === null ? null : Math.max(0, target - now);
  const ended = left === 0;

  // When the clock runs out the shelf is stale — ask the server for the current one.
  useEffect(() => {
    if (ended) router.refresh();
  }, [ended, router]);

  const days = left === null ? 0 : Math.floor(left / 86_400);
  const units =
    left === null
      ? ['--', '--', '--']
      : [pad(Math.floor((left % 86_400) / 3_600)), pad(Math.floor((left % 3_600) / 60)), pad(left % 60)];

  return (
    <div role="timer" aria-label="Time left in the flash sale" className="flex items-center gap-1.5 text-base font-bold tabular-nums">
      {days > 0 && <span className="mr-1 text-white">{days}d</span>}
      {units.map((unit, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="min-w-9 rounded-lg bg-brand-accent px-2 py-1 text-center text-black">{unit}</span>
          {i < 2 && (
            <span aria-hidden className="text-white/80">
              :
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
