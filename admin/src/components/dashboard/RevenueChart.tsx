import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RevenueSeriesPoint } from '@/types/dashboard';

interface ChartTooltipProps {
  active?: boolean;
  payload?: { payload: RevenueSeriesPoint }[];
  label?: string;
}

// Every colour here is a CSS variable, so the chart follows both the light/dark toggle and the
// store's colour theme (the line uses --brand-ink: the brand colour that is readable on the
// current surface). Single series, so no legend box — the card title says what's plotted.
const INK = 'var(--brand-ink)';
const GRIDLINE = 'var(--slate-200)';
const AXIS_TEXT = 'var(--slate-400)';

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function CustomTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length || !label) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-lg border border-slate-300 bg-slate-200 px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-slate-500">
        {new Date(label).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </p>
      <p className="font-semibold text-slate-800">৳{point.revenue.toLocaleString()}</p>
      <p className="text-slate-400">
        {point.orders} order{point.orders === 1 ? '' : 's'}
      </p>
    </div>
  );
}

export function RevenueChart({ data }: { data: RevenueSeriesPoint[] }) {
  const ticks = data.filter((_, i) => (data.length - 1 - i) % 2 === 0).map((d) => d.date);
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 22, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: INK, stopOpacity: 0.18 }} />
            <stop offset="100%" style={{ stopColor: INK, stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRIDLINE} />
        <XAxis
          dataKey="date"
          ticks={ticks}
          interval={0}
          tickFormatter={(d: string) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          tick={{ fontSize: 11, fill: AXIS_TEXT }}
          axisLine={{ stroke: GRIDLINE }}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          tickFormatter={formatCompact}
          tick={{ fontSize: 11, fill: AXIS_TEXT }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--slate-300)', strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={INK}
          strokeWidth={2}
          fill="url(#revenueFill)"
          dot={false}
          activeDot={{ r: 4, fill: INK, stroke: 'var(--slate-100)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
