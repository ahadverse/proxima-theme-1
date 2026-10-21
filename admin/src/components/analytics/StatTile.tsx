import { ArrowDown, ArrowUp, Minus, type LucideIcon } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

type Tone = 'emerald' | 'blue' | 'amber' | 'violet' | 'cyan';

const toneClasses: Record<Tone, string> = {
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
  cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400',
};

/** A thin trend line under the value — no axes, it only shows the shape of the period. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const points = values
    .map((v, i) => `${((i / (values.length - 1)) * 100).toFixed(2)},${(25 - (v / max) * 23).toFixed(2)}`)
    .join(' ');

  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-24 shrink-0" aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke="var(--brand-ink)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Direction of change; colour says good/bad (every metric here is "up is good"), the arrow says which way. */
function Delta({ pct, versus }: { pct: number | null; versus: string }) {
  if (pct === null) return <p className="text-xs text-slate-400">No earlier data to compare</p>;

  const Icon = pct > 0 ? ArrowUp : pct < 0 ? ArrowDown : Minus;
  const tone =
    pct > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : pct < 0
        ? 'text-red-600 dark:text-red-400'
        : 'text-slate-400';

  return (
    <p className="flex items-center gap-1.5 text-xs">
      <span className={cn('inline-flex items-center gap-0.5 font-medium', tone)}>
        <Icon className="h-3 w-3" />
        {pct > 0 ? '+' : ''}
        {pct}%
      </span>
      <span className="text-slate-400">{versus}</span>
    </p>
  );
}

interface StatTileProps {
  label: string;
  value: string | null;
  icon: LucideIcon;
  tone: Tone;
  isLoading?: boolean;
  /** Percentage change vs the previous period (null = nothing to compare), and the name of that period. */
  delta?: { pct: number | null; versus: string };
  /** A secondary line when there's no delta (e.g. what the number is measured over). */
  note?: string;
  trend?: number[];
}

export function StatTile({ label, value, icon: Icon, tone, isLoading, delta, note, trend }: StatTileProps) {
  return (
    <Card>
      <CardBody className="flex h-full flex-col gap-3 py-4">
        <div className="flex items-center gap-2.5">
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', toneClasses[tone])}>
            <Icon className="h-4 w-4" />
          </span>
          <p className="text-sm text-slate-500">{label}</p>
        </div>

        {/* The value and its trend line share a row; the comparison gets the full width beneath so it never wraps into the sparkline. */}
        <div className="flex items-end justify-between gap-3">
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            // Proportional figures: tabular digits look loose at this size.
            <p className="text-2xl font-semibold tracking-tight text-slate-900">{value ?? '—'}</p>
          )}
          {!isLoading && trend && <Sparkline values={trend} />}
        </div>

        <div className="mt-auto min-h-4">
          {isLoading ? null : delta ? <Delta {...delta} /> : note ? <p className="text-xs text-slate-400">{note}</p> : null}
        </div>
      </CardBody>
    </Card>
  );
}
