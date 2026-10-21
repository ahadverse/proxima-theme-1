import { useState } from 'react';
import { Eye } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { useOrdersAdmin, type OrderListFilters } from '@/api/orders';
import { OrderDetailModal } from './OrderDetailModal';
import type { Order, OrderStatus, PaymentStatus } from '@/types/order';

const statusTone: Record<OrderStatus, 'green' | 'amber' | 'red' | 'slate' | 'blue'> = {
  pending: 'slate',
  confirmed: 'blue',
  processing: 'amber',
  shipped: 'blue',
  delivered: 'green',
  cancelled: 'red',
  returned: 'red',
};
const paymentTone: Record<PaymentStatus, 'green' | 'amber' | 'red' | 'slate'> = {
  pending: 'amber',
  paid: 'green',
  failed: 'red',
  refunded: 'slate',
};
const fraudTone: Record<'low' | 'medium' | 'high', 'green' | 'amber' | 'red'> = {
  low: 'green',
  medium: 'amber',
  high: 'red',
};

export default function Orders() {
  const [filters, setFilters] = useState<OrderListFilters>({ page: 1, limit: 20 });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useOrdersAdmin(filters);

  const columns: Column<Order>[] = [
    { header: 'Order', key: 'orderNumber', render: (o) => <span className="font-medium text-slate-800">{o.orderNumber}</span> },
    { header: 'Customer', key: 'customer', render: (o) => o.customer?.name ?? o.guestInfo?.name ?? 'Guest' },
    { header: 'Total', key: 'total', render: (o) => `৳${o.pricing.grandTotal.toLocaleString()}` },
    { header: 'Payment', key: 'paymentStatus', render: (o) => <Badge tone={paymentTone[o.paymentStatus]}>{o.paymentStatus}</Badge> },
    { header: 'Status', key: 'orderStatus', render: (o) => <Badge tone={statusTone[o.orderStatus]}>{o.orderStatus}</Badge> },
    {
      header: 'Risk',
      key: 'fraudRisk',
      render: (o) =>
        o.fraudRisk.level !== 'low' ? <Badge tone={fraudTone[o.fraudRisk.level]}>{o.fraudRisk.level}</Badge> : null,
    },
    { header: 'Placed', key: 'createdAt', render: (o) => new Date(o.createdAt).toLocaleDateString() },
    {
      header: '',
      key: 'actions',
      className: 'text-right',
      render: (o) => (
        <div className="flex justify-end">
          <IconButton tone="blue" title="View details" onClick={() => setSelectedOrderId(o._id)}>
            <Eye className="h-4 w-4" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Orders</h1>

      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-200 p-4">
          <Input aria-label="Search orders by number"
            placeholder="Search order number…"
            className="max-w-xs"
            value={filters.q ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value || undefined, page: 1 }))}
          />
          <Select aria-label="Filter by order status"
            className="max-w-[160px]"
            value={filters.status ?? ''}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: (e.target.value || undefined) as OrderStatus | undefined, page: 1 }))
            }
          >
            <option value="">All statuses</option>
            {(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'] as const).map(
              (s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              )
            )}
          </Select>
          <Select aria-label="Filter by payment status"
            className="max-w-[160px]"
            value={filters.paymentStatus ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                paymentStatus: (e.target.value || undefined) as PaymentStatus | undefined,
                page: 1,
              }))
            }
          >
            <option value="">All payments</option>
            {(['pending', 'paid', 'failed', 'refunded'] as const).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>

        <Table
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(o) => o._id}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          emptyTitle="No orders yet"
          emptyDescription="Orders placed on the storefront will show up here."
        />

        {data?.meta && (
          <Pagination
            page={data.meta.page}
            pages={data.meta.pages}
            onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
          />
        )}
      </Card>

      <OrderDetailModal orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
    </div>
  );
}
