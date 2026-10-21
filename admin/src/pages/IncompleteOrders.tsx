import { useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { apiErrorMessage } from '@/lib/api';
import {
  useIncompleteOrders,
  useUpdateIncompleteOrderStatus,
  type IncompleteOrderFilters,
} from '@/api/incompleteOrders';
import type { IncompleteOrder, IncompleteOrderStatus } from '@/types/incompleteOrder';

const STATUSES: IncompleteOrderStatus[] = ['pending', 'contacted', 'recovered', 'abandoned'];

export default function IncompleteOrders() {
  const [filters, setFilters] = useState<IncompleteOrderFilters>({ page: 1, limit: 20 });
  const { data, isLoading, isError, refetch } = useIncompleteOrders(filters);
  const updateStatus = useUpdateIncompleteOrderStatus();

  function handleStatusChange(order: IncompleteOrder, status: IncompleteOrderStatus) {
    toast.promise(updateStatus.mutateAsync({ id: order._id, status }), {
      loading: 'Updating…',
      success: 'Status updated',
      error: (err) => apiErrorMessage(err, 'Could not update status'),
    });
  }

  const columns: Column<IncompleteOrder>[] = [
    {
      header: 'Contact',
      key: 'name',
      render: (o) => (
        <div>
          <p className="font-medium text-slate-800">{o.name || 'Unknown'}</p>
          <p className="text-xs text-slate-400">{o.phone}</p>
        </div>
      ),
    },
    {
      header: 'Last step',
      key: 'lastStep',
      render: (o) => <Badge tone="slate">{o.lastStep}</Badge>,
    },
    { header: 'Cart value', key: 'totalValue', render: (o) => `৳${o.totalValue.toLocaleString()}` },
    { header: 'Captured', key: 'createdAt', render: (o) => new Date(o.createdAt).toLocaleString() },
    {
      header: 'Status',
      key: 'status',
      className: 'text-right',
      render: (o) => (
        <div className="flex justify-end">
          <Select
            aria-label={`Status for ${o.phone}`}
            value={o.status}
            disabled={updateStatus.isPending}
            onChange={(e) => handleStatusChange(o, e.target.value as IncompleteOrderStatus)}
            className="w-36"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      ),
    },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Incomplete Orders</h1>

      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-200 p-4">
          <Select aria-label="Filter by status"
            className="max-w-[180px]"
            value={filters.status ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                status: (e.target.value || undefined) as IncompleteOrderStatus | undefined,
                page: 1,
              }))
            }
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
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
          emptyTitle="No abandoned carts captured"
          emptyDescription="Shoppers who start checkout but don't finish will show up here."
        />

        {data?.meta && (
          <Pagination
            page={data.meta.page}
            pages={data.meta.pages}
            onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
          />
        )}
      </Card>
    </div>
  );
}
