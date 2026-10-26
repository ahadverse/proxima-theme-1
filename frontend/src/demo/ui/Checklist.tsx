'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, PartyPopper, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { DEMO_ADMIN_URL, DEMO_CTA_LABEL, DEMO_CTA_URL } from '../config';
import { demoRequest, onActivity } from '../client/hub';
import { useDemoRevision } from '../client/hooks';
import { onOpenChecklist } from './events';

interface Step {
  key: string;
  title: string;
  hint: string;
  /** A store page, or a page of the admin. */
  link: { label: string; href: string; admin?: boolean };
}

/** Five things that show the whole store at work — the same list as in the admin, ticked off in either. */
const STEPS: Step[] = [
  {
    key: 'order',
    title: 'Place an order',
    hint: 'Add something to the cart and check out — cash on delivery is quickest. It arrives in the admin at once.',
    link: { label: 'Shop now', href: '/products' },
  },
  {
    key: 'theme',
    title: "Change the store's colours",
    hint: 'Admin → Settings → Appearance. This store repaints the moment you save.',
    link: { label: 'Open Appearance', href: '/settings?tab=appearance', admin: true },
  },
  {
    key: 'product',
    title: 'Add a product',
    hint: 'Admin → Products → Add product. Then search for it here.',
    link: { label: 'Add a product', href: '/products/new', admin: true },
  },
  {
    key: 'coupon',
    title: 'Create a coupon and use it',
    hint: 'Admin → Coupons → New coupon, then enter its code at checkout.',
    link: { label: 'Open Coupons', href: '/coupons', admin: true },
  },
  {
    key: 'status',
    title: 'Follow an order',
    hint: 'In the admin, move an order on (Confirmed, Shipped…), then look it up here on Track Order.',
    link: { label: 'Track Order', href: '/track-order' },
  },
];

interface Progress {
  steps: { key: string; doneAt: string | null }[];
  completedAt: string | null;
}

const OPEN_KEY = 'maroon-demo-checklist-open';

export function Checklist() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [open, setOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const revision = useDemoRevision();
  const panel = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const reply = await demoRequest('GET', '/__demo/progress');
    if (reply.status === 200) setProgress((reply.body as { data: Progress }).data);
  }, []);

  useEffect(() => {
    void load();
  }, [load, revision]);

  useEffect(() => {
    try {
      setOpen(sessionStorage.getItem(OPEN_KEY) === '1');
    } catch {
      // Storage blocked — it starts closed.
    }
  }, []);

  const toggle = useCallback((next: boolean) => {
    setOpen(next);
    try {
      sessionStorage.setItem(OPEN_KEY, next ? '1' : '0');
    } catch {
      // Nothing to remember it with.
    }
  }, []);

  useEffect(() => onOpenChecklist(() => toggle(true)), [toggle]);

  useEffect(
    () =>
      onActivity((event) => {
        if (event.kind !== 'checklist.done') return;
        const step = STEPS.find((s) => s.key === event.step);
        void load().then(() => {
          if (step) toast.success(`Done: ${step.title}`, { description: 'One more step of the demo checklist ticked off.' });
        });
      }),
    [load]
  );

  const doneKeys = new Set(progress?.steps.filter((s) => s.doneAt).map((s) => s.key));
  const done = doneKeys.size;
  const complete = done === STEPS.length;

  // The first time everything is ticked off in this tab, a small celebration.
  const celebrated = useRef(false);
  useEffect(() => {
    if (!complete || celebrated.current) return;
    celebrated.current = true;
    if (progress?.completedAt && Date.now() - Date.parse(progress.completedAt) < 60_000) {
      setCelebrating(true);
      toggle(true);
    }
  }, [complete, progress?.completedAt, toggle]);

  if (!progress) return null;

  return (
    <div className="fixed bottom-5 left-5 z-[60] flex flex-col items-start gap-3">
      {open && (
        <div
          ref={panel}
          role="dialog"
          aria-labelledby="demo-checklist-title"
          className="w-[min(340px,calc(100vw-40px))] overflow-hidden rounded-2xl bg-white text-slate-700 shadow-2xl ring-1 ring-black/5"
        >
          <div className="relative bg-gradient-to-br from-[#16161a] to-[#2a2018] px-5 pb-4 pt-5 text-white">
            <button
              type="button"
              onClick={() => toggle(false)}
              aria-label="Close the checklist"
              className="absolute right-3 top-3 rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">Try it</p>
            <h2 id="demo-checklist-title" className="mt-1 text-base font-bold">
              {complete ? "You've seen the whole store" : 'Five things to try'}
            </h2>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
              <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${(done / STEPS.length) * 100}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-white/60">
              {done} of {STEPS.length} done — in the store or the admin, it counts in both.
            </p>
          </div>

          {celebrating || complete ? (
            <div className="relative px-5 py-6 text-center">
              {celebrating && <Confetti />}
              <PartyPopper className="mx-auto h-10 w-10 text-amber-500" aria-hidden />
              <p className="mt-3 text-sm leading-relaxed">
                Orders, payments, stock, coupons, colours — all of it working together, all of it yours to run.
              </p>
              {DEMO_CTA_URL && (
                <a
                  href={DEMO_CTA_URL}
                  target="_blank"
                  rel="noopener"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-[#1c1100] hover:bg-amber-300"
                >
                  {DEMO_CTA_LABEL} <ArrowUpRight className="h-4 w-4" aria-hidden />
                </a>
              )}
            </div>
          ) : (
            <ol className="divide-y divide-slate-100">
              {STEPS.map((step, i) => {
                const isDone = doneKeys.has(step.key);
                return (
                  <li key={step.key} className="flex gap-3 px-5 py-3.5">
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isDone ? 'bg-emerald-500 text-white' : 'border border-slate-300 text-slate-500'
                      }`}
                    >
                      {isDone ? <Check className="h-3.5 w-3.5" aria-label="Done" /> : i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${isDone ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{step.title}</p>
                      {!isDone && (
                        <>
                          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{step.hint}</p>
                          {step.link.admin ? (
                            <a
                              href={`${DEMO_ADMIN_URL}${step.link.href}`}
                              target="_blank"
                              rel="noopener"
                              className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline"
                            >
                              {step.link.label} <ArrowUpRight className="h-3 w-3" aria-hidden />
                            </a>
                          ) : (
                            <Link href={step.link.href} className="mt-1.5 inline-block text-xs font-semibold text-amber-700 hover:underline">
                              {step.link.label} →
                            </Link>
                          )}
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}

      <button
        type="button"
        data-demo="checklist"
        onClick={() => toggle(!open)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full bg-[#16161a] py-2 pl-2 pr-4 text-sm font-semibold text-white shadow-xl ring-1 ring-white/10 transition-transform hover:scale-[1.03]"
      >
        <ProgressRing done={done} total={STEPS.length} />
        {complete ? 'All done' : 'Try it'}
        <Sparkles className="h-3.5 w-3.5 text-amber-300" aria-hidden />
      </button>
    </div>
  );
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const radius = 11;
  const circumference = 2 * Math.PI * radius;
  return (
    <span className="relative flex h-7 w-7 items-center justify-center" aria-label={`${done} of ${total} done`}>
      <svg viewBox="0 0 28 28" className="absolute inset-0 -rotate-90">
        <circle cx="14" cy="14" r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
        <circle
          cx="14"
          cy="14"
          r={radius}
          fill="none"
          stroke="#fbbf24"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - done / total)}
          className="transition-all duration-500"
        />
      </svg>
      <span className="text-[10px] font-bold">{done}</span>
    </span>
  );
}

/** A short burst of colour, CSS only. */
function Confetti() {
  const colours = ['#fbbf24', '#f472b6', '#34d399', '#60a5fa', '#f87171'];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 28 }, (_, i) => (
        <span
          key={i}
          className="demo-confetti absolute top-0 h-2 w-1.5 rounded-sm"
          style={{
            left: `${(i * 37) % 100}%`,
            background: colours[i % colours.length],
            animationDelay: `${(i % 7) * 0.08}s`,
            transform: `rotate(${i * 29}deg)`,
          }}
        />
      ))}
      <style>{`@keyframes demo-confetti{0%{transform:translateY(-10px) rotate(0)}100%{transform:translateY(240px) rotate(540deg);opacity:0}}.demo-confetti{animation:demo-confetti 1.6s ease-in forwards}`}</style>
    </div>
  );
}
