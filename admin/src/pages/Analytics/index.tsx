import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import { DollarSign, Layers, Receipt, ShoppingBag, Target } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Skeleton';
import { CategoryBars, FunnelBars, NeedsAttention, TopSellers } from '@/components/analytics/BarLists';
import { RangePicker } from '@/components/analytics/RangePicker';
import { RANGE_OPTIONS } from '@/components/analytics/ranges';
import { SalesChart, SalesTable, type SalesMetric } from '@/components/analytics/SalesChart';
import { StatTile } from '@/components/analytics/StatTile';
import {
  useAnalyticsOverview,
  useCategoryBreakdown,
  useFunnel,
  useProductPerformance,
} from '@/api/analytics';
import { cn } from '@/lib/cn';
import { formatDayKey, formatPercent, formatTaka, percentChange } from '@/lib/format';

const DEFAULT_DAYS = 30;

/**
 * A card that owns its own loading and error states. While the date range changes it keeps showing
 * the previous numbers, dimmed, rather than flashing skeletons — so the page never jumps.
 */
function Section<T>({
  title,
  subtitle,
  query,
  skeletonRows = 5,
  className,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  query: UseQueryResult<T, Error>;
  skeletonRows?: number;
  className?: string;
  actions?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-800">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
        </div>
        {actions}
      </CardHeader>
      {query.isLoading ? (
        <CardBody className="space-y-3">
          {Array.from({ length: skeletonRows }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </CardBody>
      ) : query.data ? (
        <div className={cn('transition-opacity', query.isPlaceholderData && 'opacity-60')}>{children(query.data)}</div>
      ) : (
        <ErrorState compact title={`Couldn't load ${title.toLowerCase()}`} onRetry={() => void query.refetch()} />
      )}
    </Card>
  );
}

export default function Analytics() {
  const [params, setParams] = useSearchParams();
  const requested = Number(params.get('days'));
  const days = (RANGE_OPTIONS as readonly number[]).includes(requested) ? requested : DEFAULT_DAYS;

  const [metric, setMetric] = useState<SalesMetric>('revenue');
  const [view, setView] = useState<'chart' | 'table'>('chart');

  const overview = useAnalyticsOverview(days);
  const products = useProductPerformance(days);
  const categories = useCategoryBreakdown(days);
  const funnel = useFunnel(days);

  const totals = overview.data?.totals;
  const previous = overview.data?.previous;
  const versus = `vs previous ${days} days`;
  const series = overview.data?.series ?? [];

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">How your store is selling, and how shoppers move through it.</p>
      </div>

      {/* One filter row above everything it scopes. */}
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <RangePicker value={days} onChange={(d) => setParams({ days: String(d) }, { replace: true })} />
        {overview.data && (
          <p className="text-xs text-slate-400">
            {formatDayKey(overview.data.from, true)} – {formatDayKey(overview.data.to, true)}
            <span className="mx-1.5">·</span>
            compared with {formatDayKey(overview.data.previousFrom)} – {formatDayKey(overview.data.previousTo)}
          </p>
        )}
      </div>

      <div className={cn('grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-5', overview.isPlaceholderData && 'opacity-60')}>
        <StatTile
          label="Revenue"
          icon={DollarSign}
          tone="emerald"
          isLoading={overview.isLoading}
          value={totals ? formatTaka(totals.revenue) : null}
          delta={totals && previous ? { pct: percentChange(totals.revenue, previous.revenue), versus } : undefined}
          trend={series.map((d) => d.revenue)}
        />
        <StatTile
          label="Orders"
          icon={ShoppingBag}
          tone="blue"
          isLoading={overview.isLoading}
          value={totals ? totals.orders.toLocaleString() : null}
          delta={totals && previous ? { pct: percentChange(totals.orders, previous.orders), versus } : undefined}
          trend={series.map((d) => d.orders)}
        />
        <StatTile
          label="Average order value"
          icon={Receipt}
          tone="amber"
          isLoading={overview.isLoading}
          value={totals ? formatTaka(totals.averageOrderValue) : null}
          delta={
            totals && previous
              ? { pct: percentChange(totals.averageOrderValue, previous.averageOrderValue), versus }
              : undefined
          }
        />
        <StatTile
          label="Units sold"
          icon={Layers}
          tone="violet"
          isLoading={overview.isLoading}
          value={totals ? totals.units.toLocaleString() : null}
          delta={totals && previous ? { pct: percentChange(totals.units, previous.units), versus } : undefined}
          trend={series.map((d) => d.units)}
        />
        <StatTile
          label="Visitor conversion"
          icon={Target}
          tone="cyan"
          isLoading={funnel.isLoading}
          value={funnel.data?.conversionRate != null ? formatPercent(funnel.data.conversionRate) : null}
          note="Visitors who ordered ÷ visitors who browsed"
        />
      </div>

      <Section
        className="mt-6"
        title="Sales over time"
        subtitle="Orders that aren't cancelled or returned. Days follow your store's timezone."
        query={overview}
        actions={
          <div className="flex flex-wrap gap-2">
            <Segmented
              label="Metric"
              value={metric}
              onChange={setMetric}
              options={[
                { value: 'revenue', label: 'Revenue' },
                { value: 'orders', label: 'Orders' },
              ]}
            />
            <Segmented
              label="View"
              value={view}
              onChange={setView}
              options={[
                { value: 'chart', label: 'Chart' },
                { value: 'table', label: 'Table' },
              ]}
            />
          </div>
        }
      >
        {(data) =>
          data.totals.orders === 0 ? (
            <EmptyState
              title="No sales in this period"
              description="Orders placed on your storefront will chart here once they come in."
            />
          ) : (
            <CardBody>
              {view === 'chart' ? <SalesChart data={data.series} metric={metric} /> : <SalesTable data={data.series} />}
            </CardBody>
          )
        }
      </Section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Top sellers" subtitle="By units sold" query={products}>
          {(data) => <TopSellers rows={data.top} />}
        </Section>
        <Section
          title="Shopper funnel"
          subtitle="Visitors, from first product view to order"
          query={funnel}
          skeletonRows={3}
        >
          {(data) => <FunnelBars funnel={data} />}
        </Section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Sales by category" subtitle="Product sales, rolled up to top-level categories" query={categories}>
          {(data) => <CategoryBars rows={data.categories} />}
        </Section>
        <Section
          title="Needs attention"
          subtitle="Active products that sold least — traffic with no sales comes first"
          query={products}
        >
          {(data) => <NeedsAttention rows={data.worst} />}
        </Section>
      </div>
    </div>
  );
}
