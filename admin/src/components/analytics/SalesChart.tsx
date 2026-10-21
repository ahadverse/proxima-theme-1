import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatAxis, formatDayKey, formatTakaExact } from '@/lib/format';
import type { SalesPoint } from '@/types/analytics';

export type SalesMetric = 'revenue' | 'orders';

// Every colour is a CSS variable, so the chart follows the light/dark toggle and the store's theme
// (the line is --brand-ink: the brand colour that is readable on the current surface). One series,
// so no legend — the card title and the metric switch say what is plotted.
const INK = 'var(--brand-ink)';
const GRIDLINE = 'var(--slate-200)';
const AXIS_TEXT = 'var(--slate-400)';

interface TooltipProps {
  active?: boolean;
  payload?: { payload: SalesPoint }[];
  metric: SalesMetric;
}

/** The one readout for the hovered day: the plotted value leads, the other measure follows. */
function SalesTooltip({ active, payload, metric }: TooltipProps) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  const orders = `${point.orders} order${point.orders === 1 ? '' : 's'}`;
  const [primary, secondary] =
    metric === 'revenue' ? [formatTakaExact(point.revenue), orders] : [orders, formatTakaExact(point.revenue)];

  return (
    <div className="rounded-lg border border-slate-300 bg-slate-200 px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-slate-500">{formatDayKey(point.date, true)}</p>
      <p className="flex items-center gap-1.5 text-base font-semibold text-slate-800">
        <span className="inline-block h-0.5 w-3 rounded-full" style={{ background: INK }} />
        {primary}
      </p>
      <p className="mt-0.5 text-slate-400">{secondary}</p>
    </div>
  );
}

export function SalesChart({ data, metric }: { data: SalesPoint[]; metric: SalesMetric }) {
  // About seven labels however long the range is.
  const tickInterval = Math.max(0, Math.ceil(data.length / 7) - 1);

  return (
    // The height includes the x-axis band, so the card never grows a nested scrollbar.
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 22, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: INK, stopOpacity: 0.14 }} />
            <stop offset="100%" style={{ stopColor: INK, stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRIDLINE} />
        <XAxis
          dataKey="date"
          interval={tickInterval}
          tickFormatter={(d: string) => formatDayKey(d)}
          tick={{ fontSize: 11, fill: AXIS_TEXT }}
          axisLine={{ stroke: GRIDLINE }}
          tickLine={false}
          minTickGap={16}
        />
        <YAxis
          allowDecimals={false}
          tickFormatter={formatAxis}
          tick={{ fontSize: 11, fill: AXIS_TEXT }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip
          content={<SalesTooltip metric={metric} />}
          cursor={{ stroke: 'var(--slate-300)', strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey={metric}
          stroke={INK}
          strokeWidth={2}
          fill="url(#salesFill)"
          dot={false}
          activeDot={{ r: 4, fill: INK, stroke: 'var(--slate-100)', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** The chart's table twin: the same numbers, readable without hovering or seeing colour. */
export function SalesTable({ data }: { data: SalesPoint[] }) {
  const rows = [...data].reverse();

  return (
    <div className="max-h-[280px] overflow-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-slate-100">
          <tr className="border-b border-slate-200 text-xs tracking-wide text-slate-400 uppercase">
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 text-right font-medium">Revenue</th>
            <th className="px-3 py-2 text-right font-medium">Orders</th>
            <th className="px-3 py-2 text-right font-medium">Units</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 tabular-nums">
          {rows.map((d) => (
            <tr key={d.date} className={d.orders === 0 ? 'text-slate-400' : 'text-slate-700'}>
              <td className="px-3 py-1.5">{formatDayKey(d.date, true)}</td>
              <td className="px-3 py-1.5 text-right">{formatTakaExact(d.revenue)}</td>
              <td className="px-3 py-1.5 text-right">{d.orders}</td>
              <td className="px-3 py-1.5 text-right">{d.units}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
