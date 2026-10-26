import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, PartyPopper, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { DEMO_CTA_LABEL, DEMO_CTA_URL, DEMO_STORE_URL } from './config';
import { demoRequest, onActivity, onChange } from './hub';
import { onOpenChecklist } from './events';

interface Step {
  key: string;
  title: string;
  hint: string;
  /** A page of this admin, or of the store. */
  link: { label: string; href: string; store?: boolean };
}

/** Five things that show the whole store at work — the same list as in the demo store, ticked off in either. */
const STEPS: Step[] = [
  {
    key: 'order',
    title: 'Place an order in the store',
    hint: 'Shop as a customer and check out — the order lands here in Orders and on the Dashboard at once.',
    link: { label: 'Open the store', href: '/products', store: true },
  },
  {
    key: 'theme',
    title: "Change the store's colours",
    hint: 'Settings → Appearance. The store (and this admin) repaints the moment you save.',
    link: { label: 'Open Appearance', href: '/settings?tab=appearance' },
  },
  {
    key: 'product',
    title: 'Add a product',
    hint: 'Products → Add product, then find it in the store.',
    link: { label: 'Add a product', href: '/products/new' },
  },
  {
    key: 'coupon',
    title: 'Create a coupon and use it',
    hint: 'Coupons → New coupon, then enter its code at the store’s checkout.',
    link: { label: 'Open Coupons', href: '/coupons' },
  },
  {
    key: 'status',
    title: 'Follow an order',
    hint: 'Move an order on in Orders (Confirmed, Shipped…), then look it up on the store’s Track Order page.',
    link: { label: 'Open Orders', href: '/orders' },
  },
];

interface Progress {
  steps: { key: string; doneAt: string | null }[];
  completedAt: string | null;
}

const OPEN_KEY = 'maroon-demo-checklist-open';

export function Checklist() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [open, setOpen] = useState(() => {
    try {
      return sessionStorage.getItem(OPEN_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [celebrating, setCelebrating] = useState(false);

  const load = useCallback(async () => {
    const reply = await demoRequest('GET', '/__demo/progress');
    if (reply.status === 200) setProgress((reply.body as { data: Progress }).data);
  }, []);

  useEffect(() => {
    void load();
    return onChange(() => void load());
  }, [load]);

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
    <div className="fixed right-5 bottom-5 z-[60] flex flex-col items-end gap-3">
      {open && (
        <div
          role="dialog"
          aria-labelledby="demo-checklist-title"
          className="w-[min(340px,calc(100vw-40px))] overflow-hidden rounded-2xl bg-slate-100 text-slate-700 shadow-2xl ring-1 ring-slate-200"
        >
          <div className="relative bg-gradient-to-br from-[#16161a] to-[#2a2018] px-5 pt-5 pb-4 text-white">
            <button
              type="button"
              onClick={() => toggle(false)}
              aria-label="Close the checklist"
              className="absolute top-3 right-3 rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            <p className="text-[11px] font-bold tracking-wider text-amber-300 uppercase">Try it</p>
            <h2 id="demo-checklist-title" className="mt-1 text-base font-bold">
              {complete ? "You've seen the whole store" : 'Five things to try'}
            </h2>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
              <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${(done / STEPS.length) * 100}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-white/60">
              {done} of {STEPS.length} done — in the admin or the store, it counts in both.
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
            <ol className="divide-y divide-slate-200">
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
                          {step.link.store ? (
                            <a
                              href={`${DEMO_STORE_URL}${step.link.href}`}
                              target="_blank"
                              rel="noopener"
                              className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-500 hover:underline"
                            >
                              {step.link.label} <ArrowUpRight className="h-3 w-3" aria-hidden />
                            </a>
                          ) : (
                            <Link to={step.link.href} className="mt-1.5 inline-block text-xs font-semibold text-amber-500 hover:underline">
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
        className="inline-flex items-center gap-2 rounded-full bg-[#16161a] py-2 pr-4 pl-2 text-sm font-semibold text-white shadow-xl ring-1 ring-white/10 transition-transform hover:scale-[1.03]"
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
