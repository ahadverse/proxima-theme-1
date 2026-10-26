
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { onOpenTour } from './events';

export interface TourStep {
  /** The element to point at (the first visible match), or null for a card in the middle of the screen. */
  target: string | null;
  title: string;
  body: ReactNode;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;
const CARD_WIDTH = 340;
/** The tallest the card gets (a long step text on a phone), for deciding whether it fits above or below its target. */
const CARD_MAX_HEIGHT = 280;

function findTarget(selector: string | null): HTMLElement | null {
  if (!selector) return null;
  return [...document.querySelectorAll<HTMLElement>(selector)].find((el) => el.offsetParent !== null && el.getBoundingClientRect().width > 0) ?? null;
}

const readSaved = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const save = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the tour simply starts again next time.
  }
};

/**
 * A short guided tour: a spotlight on one real part of the page at a time, with a card saying what it is. Skippable,
 * replayable from the demo bar, and it remembers where the visitor stopped.
 */
export function Tour({ steps, storageKey, autoStart = true }: { steps: TourStep[]; storageKey: string; autoStart?: boolean }) {
  const [index, setIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const card = useRef<HTMLDivElement>(null);

  const close = useCallback(
    (finished: boolean) => {
      setIndex(null);
      save(storageKey, finished ? 'done' : 'skipped');
    },
    [storageKey]
  );

  useEffect(() => {
    if (!autoStart) return;
    const saved = readSaved(storageKey);
    if (saved === 'done' || saved === 'skipped') return;
    const timer = setTimeout(() => setIndex(Math.min(Number(saved) || 0, steps.length - 1)), 900);
    return () => clearTimeout(timer);
  }, [autoStart, steps.length, storageKey]);

  useEffect(() => onOpenTour(() => setIndex(0)), []);

  // Where the current step's element is — again whenever the page scrolls or resizes.
  useLayoutEffect(() => {
    if (index === null) return;
    save(storageKey, String(index));
    const element = findTarget(steps[index].target);
    if (!element) {
      setRect(null);
      return;
    }
    element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const measure = () => {
      const r = element.getBoundingClientRect();
      setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
    };
    measure();
    const settle = setTimeout(measure, 400);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      clearTimeout(settle);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [index, steps, storageKey]);

  useEffect(() => {
    if (index === null) return;
    card.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'ArrowRight') setIndex((i) => (i === null ? i : Math.min(i + 1, steps.length - 1)));
      if (e.key === 'ArrowLeft') setIndex((i) => (i === null ? i : Math.max(i - 1, 0)));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, close, steps.length]);

  if (index === null) return null;
  const step = steps[index];
  const last = index === steps.length - 1;

  // The card goes below the element if there is room, else above it; in the middle of the screen when there is no element.
  const viewportWidth = typeof window === 'undefined' ? 1024 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 768 : window.innerHeight;
  const width = Math.min(CARD_WIDTH, viewportWidth - 32);
  let position: CSSProperties;
  if (!rect) {
    position = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width };
  } else {
    const below = rect.top + rect.height + 12;
    const left = Math.max(16, Math.min(rect.left + rect.width / 2 - width / 2, viewportWidth - width - 16));
    if (below + CARD_MAX_HEIGHT < viewportHeight) {
      position = { top: below, left, width };
    } else if (rect.top - 12 >= CARD_MAX_HEIGHT) {
      position = { bottom: viewportHeight - rect.top + 12, left, width };
    } else {
      // A tall target (the admin's sidebar) leaves no room above or below: the card goes beside it when the screen is wide
      // enough, else over its lower part — never out of the screen.
      const beside = rect.left + rect.width + 12;
      position = {
        top: Math.max(16, Math.min(rect.top + 16, viewportHeight - CARD_MAX_HEIGHT - 16)),
        left: beside + width + 16 <= viewportWidth ? beside : left,
        width,
      };
    }
  }

  return (
    <div className="fixed inset-0 z-[80]" aria-live="polite">
      {rect ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-xl ring-2 ring-amber-300 transition-all duration-300 ease-out"
          style={{ ...rect, boxShadow: '0 0 0 9999px rgba(8, 8, 12, 0.62)' }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-[rgba(8,8,12,0.62)]" />
      )}
      <div
        ref={card}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-tour-title"
        className="absolute rounded-2xl bg-slate-100 p-5 text-slate-700 shadow-2xl ring-1 ring-slate-200 outline-none"
        style={position}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
            {index + 1} of {steps.length}
          </span>
          <button type="button" onClick={() => close(false)} aria-label="Close the tour" className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <h2 id="demo-tour-title" className="text-base font-bold text-slate-900">
          {step.title}
        </h2>
        <div className="mt-1.5 text-sm leading-relaxed">{step.body}</div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1" aria-hidden>
            {steps.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-amber-500' : 'w-1.5 bg-slate-300'}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex(index - 1)}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-200"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? close(true) : setIndex(index + 1))}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-slate-50 hover:bg-slate-800"
            >
              {last ? 'Done' : index === 0 ? 'Show me around' : 'Next'} {!last && <ArrowRight className="h-3.5 w-3.5" aria-hidden />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
