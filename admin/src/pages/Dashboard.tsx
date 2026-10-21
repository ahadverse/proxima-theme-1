import { motion } from 'framer-motion';
import { AlertTriangle, ArrowDown, ArrowUp, DollarSign, PackageX, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { TopProducts } from '@/components/dashboard/TopProducts';
import { useDashboardSummary } from '@/api/dashboard';
import { useRecentOrders } from '@/api/orders';
import { cn } from '@/lib/cn';
import type { DashboardSummary } from '@/types/dashboard';
import type { Order, OrderStatus } from '@/types/order';

type Tone = 'emerald' | 'blue' | 'red' | 'amber';

const toneClasses: Record<Tone, string> = {
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
  red: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
};

const summaryCards: {
  label: string;
  icon: typeof DollarSign;
  tone: Tone;
  value: (s: DashboardSummary) => string;
  trendPct?: (s: DashboardSummary) => number;
}[] = [
  {
    label: 'Revenue (30d)',
    icon: DollarSign,
    tone: 'emerald',
    value: (s) => `৳${s.revenue30d.toLocaleString()}`,
    trendPct: (s) => s.revenueTrendPct,
  },
  {
    label: 'Orders (30d)',
    icon: ShoppingBag,
    tone: 'blue',
    value: (s) => String(s.orders30d),
    trendPct: (s) => s.ordersTrendPct,
  },
  { label: 'High-risk orders', icon: AlertTriangle, tone: 'red', value: (s) => String(s.highRiskOrders30d) },
  { label: 'Low-stock products', icon: PackageX, tone: 'amber', value: (s) => String(s.lowStockProducts) },
];

function Trend({ pct }: { pct: number }) {
  const isUp = pct >= 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium',
        isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
      )}
    >
      {isUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(pct)}%
    </span>
  );
}

const orderStatusTone: Record<OrderStatus, 'green' | 'amber' | 'red' | 'slate' | 'blue'> = {
  pending: 'slate',
  confirmed: 'blue',
  processing: 'amber',
  shipped: 'blue',
  delivered: 'green',
  cancelled: 'red',
  returned: 'red',
};

function RecentOrders() {
  const { data: orders, isLoading, isError, refetch } = useRecentOrders(5);

  const columns: Column<Order>[] = [
    {
      header: 'Order',
      key: 'orderNumber',
      render: (o) => <span className="font-medium text-slate-800">{o.orderNumber}</span>,
    },
    { header: 'Customer', key: 'customer', render: (o) => o.customer?.name ?? o.guestInfo?.name ?? 'Guest' },
    { header: 'Total', key: 'total', render: (o) => `৳${o.pricing.grandTotal.toLocaleString()}` },
    {
      header: 'Status',
      key: 'orderStatus',
      render: (o) => <Badge tone={orderStatusTone[o.orderStatus]}>{o.orderStatus}</Badge>,
    },
    { header: 'Placed', key: 'createdAt', render: (o) => new Date(o.createdAt).toLocaleDateString() },
  ];

  return (
    <Table
      columns={columns}
      rows={orders ?? []}
      rowKey={(o) => o._id}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      emptyTitle="No orders yet"
      emptyDescription="Orders placed on the storefront will show up here."
    />
  );
}

export default function Dashboard() {
  const { data: summary, isLoading, refetch } = useDashboardSummary();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <motion.div key={card.label} whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
            <Card>
              <CardBody className="flex items-center gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${toneClasses[card.tone]}`}
                >
                  <card.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{card.label}</p>
                  {isLoading ? (
                    <Skeleton className="mt-1 h-6 w-16" />
                  ) : summary ? (
                    <div className="flex items-baseline gap-2">
                      <p className="text-xl font-semibold text-slate-900">{card.value(summary)}</p>
                      {card.trendPct && <Trend pct={card.trendPct(summary)} />}
                    </div>
                  ) : (
                    <p className="text-xl font-semibold text-slate-400">—</p>
                  )}
                </div>
              </CardBody>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Revenue — last 14 days</h2>
            <Link to="/analytics" className="text-xs font-medium text-brand-ink hover:underline">
              View analytics
            </Link>
          </CardHeader>
          <CardBody>
            {isLoading ? (
              <Skeleton className="h-60 w-full" />
            ) : summary ? (
              <RevenueChart data={summary.revenueSeries} />
            ) : (
              <ErrorState compact title="Couldn't load revenue" onRetry={() => void refetch()} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-800">Top products</h2>
          </CardHeader>
          {isLoading ? (
            <CardBody>
              <Skeleton className="h-60 w-full" />
            </CardBody>
          ) : summary ? (
            <TopProducts products={summary.topProducts} />
          ) : (
            <ErrorState compact title="Couldn't load top products" onRetry={() => void refetch()} />
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Recent orders</h2>
          <Link to="/orders" className="text-xs font-medium text-brand-ink hover:underline">
            View all
          </Link>
        </CardHeader>
        <RecentOrders />
      </Card>
    </div>
  );
}
