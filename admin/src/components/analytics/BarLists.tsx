import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { HoverTip } from '@/components/ui/HoverTip';
import { formatPercent, formatTaka, formatTakaExact } from '@/lib/format';
import type {
  CategoryRow,
  Funnel,
  ProductPerformanceRow,
} from '@/types/analytics';

// One brand colour for a single series of bars (the bars are nominal — products, categories — so
// they never take a colour per value). Text stays in text tokens; the colour is only on the mark.
const INK = 'var(--brand-ink)';

/** A bar grows from a flat baseline and rounds only the end that carries the value. */
function Bar({ ratio, width, thickness = 'h-2' }: { ratio: number; width: string; thickness?: string }) {
  return (
    <div
      className={`${thickness} shrink-0 rounded-r-[4px]`}
      style={{ width: `calc(${width} * ${ratio})`, minWidth: ratio > 0 ? 3 : 0, background: INK }}
    />
  );
}

function Thumb({ src }: { src: string | null }) {
  return src ? (
    <img src={src} alt="" className="h-9 w-9 shrink-0 rounded-lg bg-slate-200 object-cover" />
  ) : (
    <div className="h-9 w-9 shrink-0 rounded-lg bg-slate-200" />
  );
}

/** One label/value line in a tooltip: the value leads, the label is secondary. */
function TipRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-semibold text-slate-800 tabular-nums">{value}</dd>
    </div>
  );
}

function ProductTip({ p }: { p: ProductPerformanceRow }) {
  return (
    <>
      <p className="mb-1.5 truncate font-medium text-slate-800">{p.title}</p>
      <dl className="space-y-0.5">
        <TipRow label="Units sold" value={p.units.toLocaleString()} />
        <TipRow label="Revenue" value={formatTakaExact(p.revenue)} />
        <TipRow label="Orders" value={p.orders.toLocaleString()} />
        <TipRow label="Product views" value={p.views.toLocaleString()} />
        <TipRow label="Add-to-carts" value={p.addToCarts.toLocaleString()} />
      </dl>
    </>
  );
}

// ---------------------------------------------------------------------------------------------

/** Best sellers by units sold. */
export function TopSellers({ rows }: { rows: ProductPerformanceRow[] }) {
  if (rows.length === 0) {
    return <EmptyState title="No sales in this period" description="Products that sell will be ranked here." />;
  }
  const max = Math.max(...rows.map((r) => r.units), 1);

  return (
    <ul className="space-y-0.5 px-3 pb-3">
      {rows.map((p, i) => (
        <li key={p.id}>
          <HoverTip content={<ProductTip p={p} />} className="block px-2 py-2">
            <div className="flex items-center gap-3">
              <span className="w-4 shrink-0 text-center text-xs font-semibold text-slate-400">{i + 1}</span>
              <Thumb src={p.image} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-700">{p.title}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <Bar ratio={p.units / max} width="(100% - 9.5rem)" />
                  <span className="text-xs whitespace-nowrap text-slate-500">
                    <strong className="font-semibold text-slate-800">{p.units.toLocaleString()}</strong> sold ·{' '}
                    {formatTaka(p.revenue)}
                  </span>
                </div>
              </div>
            </div>
          </HoverTip>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------------------------

const MAX_CATEGORIES = 8;

/** Product sales by top-level category. More than eight collapse the tail into "Other". */
export function CategoryBars({ rows }: { rows: CategoryRow[] }) {
  if (rows.length === 0) {
    return <EmptyState title="No sales in this period" description="Sales will be broken down by category here." />;
  }

  const shown: CategoryRow[] = rows.slice(0, MAX_CATEGORIES);
  if (rows.length > MAX_CATEGORIES) {
    const tail = rows.slice(MAX_CATEGORIES);
    shown.push({
      id: null,
      name: `Other (${tail.length})`,
      slug: null,
      units: tail.reduce((s, c) => s + c.units, 0),
      revenue: tail.reduce((s, c) => s + c.revenue, 0),
      share: tail.reduce((s, c) => s + c.share, 0),
    });
  }
  const max = Math.max(...shown.map((c) => c.revenue), 1);

  return (
    <ul className="space-y-0.5 px-3 pb-3">
      {shown.map((c) => (
        <li key={c.id ?? c.name}>
          <HoverTip
            className="block px-2 py-2"
            content={
              <>
                <p className="mb-1.5 font-medium text-slate-800">{c.name}</p>
                <dl className="space-y-0.5">
                  <TipRow label="Revenue" value={formatTakaExact(c.revenue)} />
                  <TipRow label="Share of sales" value={formatPercent(c.share)} />
                  <TipRow label="Units sold" value={c.units.toLocaleString()} />
                </dl>
              </>
            }
          >
            <p className="text-sm text-slate-700">{c.name}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <Bar ratio={c.revenue / max} width="(100% - 8rem)" thickness="h-3" />
              <span className="text-xs whitespace-nowrap text-slate-500">
                <strong className="font-semibold text-slate-800">{formatTaka(c.revenue)}</strong> ·{' '}
                {formatPercent(c.share, 0)}
              </span>
            </div>
          </HoverTip>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------------------------

// The stages are ordered, so they take one hue stepped in lightness (never a colour per stage):
// the brand ink, then 35% and 65% of the way toward the text colour — darker in light mode,
// lighter in dark mode, always at least as visible as the ink itself.
const STAGE_MIX = [0, 35, 65];
const stageColor = (i: number) => `color-mix(in oklab, ${INK} ${100 - STAGE_MIX[i]}%, var(--slate-900))`;

/** Visitors moving from browsing, to the cart, to an order. */
export function FunnelBars({ funnel }: { funnel: Funnel }) {
  const first = funnel.steps[0]?.visitors ?? 0;
  if (first === 0) {
    return (
      <EmptyState
        title="No visitor activity yet"
        description="Product views and add-to-carts are recorded as shoppers use your storefront, and show up here."
      />
    );
  }

  return (
    <div className="px-5 pb-5">
      <ul className="space-y-1">
        {funnel.steps.map((step, i) => {
          const previous = i === 0 ? null : funnel.steps[i - 1].visitors;
          const ofPrevious = previous ? step.visitors / previous : null;
          const ofFirst = step.visitors / first;

          return (
            <li key={step.key}>
              <HoverTip
                className="block px-2 py-2"
                content={
                  <>
                    <p className="mb-1.5 font-medium text-slate-800">{step.label}</p>
                    <dl className="space-y-0.5">
                      <TipRow label="Visitors" value={step.visitors.toLocaleString()} />
                      <TipRow label="Of everyone who browsed" value={formatPercent(ofFirst)} />
                      {ofPrevious !== null && <TipRow label="Of the step before" value={formatPercent(ofPrevious)} />}
                    </dl>
                  </>
                }
              >
                <p className="text-sm text-slate-700">{step.label}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div
                    className="h-4 shrink-0 rounded-r-[4px]"
                    style={{ width: `calc((100% - 8rem) * ${ofFirst})`, minWidth: step.visitors > 0 ? 3 : 0, background: stageColor(i) }}
                  />
                  <span className="text-xs whitespace-nowrap text-slate-500">
                    <strong className="font-semibold text-slate-800">{step.visitors.toLocaleString()}</strong>
                    {ofPrevious !== null && <> · {formatPercent(ofPrevious, 0)}</>}
                  </span>
                </div>
              </HoverTip>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-sm text-slate-600">
        {funnel.conversionRate !== null && (
          <>
            <strong className="font-semibold text-slate-800">{formatPercent(funnel.conversionRate)}</strong> of visitors
            who browsed products placed an order.
          </>
        )}
      </p>
      <p className="mt-1 text-xs text-slate-400">
        {funnel.events.views.toLocaleString()} product views · {funnel.events.addToCarts.toLocaleString()} add-to-carts ·{' '}
        {funnel.events.purchases.toLocaleString()} items purchased. Each percentage is of the step before.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

/** Active products that sold the least, with the traffic they got — where a listing, price or stock problem may be hiding. */
export function NeedsAttention({ rows }: { rows: ProductPerformanceRow[] }) {
  if (rows.length === 0) {
    return <EmptyState title="Nothing to flag" description="Products older than a week that sell poorly will appear here." />;
  }

  return (
    <ul className="space-y-0.5 px-3 pb-3">
      {rows.map((p) => (
        <li key={p.id}>
          <HoverTip content={<ProductTip p={p} />} className="block px-2 py-2">
            <div className="flex items-center gap-3">
              <Thumb src={p.image} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-slate-700">{p.title}</p>
                  {p.stockStatus === 'out_of_stock' && <Badge tone="red">Out of stock</Badge>}
                  {p.stockStatus === 'low_stock' && <Badge tone="amber">Low stock</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  <span className={p.units === 0 ? 'font-medium text-slate-500' : undefined}>
                    {p.units === 0 ? 'No sales' : `${p.units} sold`}
                  </span>{' '}
                  · {p.views.toLocaleString()} views · {p.addToCarts.toLocaleString()} add-to-carts
                </p>
              </div>
            </div>
          </HoverTip>
        </li>
      ))}
    </ul>
  );
}
