import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { apiErrorMessage } from '@/lib/api';
import { useCoupons, useDeleteCoupon, type CouponFilters } from '@/api/coupons';
import { CouponFormModal } from './CouponFormModal';
import type { Coupon } from '@/types/coupon';

export default function Coupons() {
  const [filters, setFilters] = useState<CouponFilters>({ page: 1, limit: 20 });
  const { data, isLoading, isError, refetch } = useCoupons(filters);
  const deleteMutation = useDeleteCoupon();
  const [modalCoupon, setModalCoupon] = useState<Coupon | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);

  function handleDelete() {
    if (!deleteTarget) return;
    const code = deleteTarget.code;
    toast.promise(deleteMutation.mutateAsync(deleteTarget._id), {
      loading: `Deleting ${code}…`,
      success: () => {
        setDeleteTarget(null);
        return `${code} deleted`;
      },
      error: (err) => apiErrorMessage(err, 'Could not delete coupon'),
    });
  }

  const columns: Column<Coupon>[] = [
    { header: 'Code', key: 'code', render: (c) => <span className="font-mono font-semibold text-slate-800">{c.code}</span> },
    {
      header: 'Discount',
      key: 'value',
      render: (c) => (c.type === 'percentage' ? `${c.value}%` : `৳${c.value.toLocaleString()}`),
    },
    { header: 'Min order', key: 'minOrderAmount', render: (c) => `৳${c.minOrderAmount.toLocaleString()}` },
    {
      header: 'Usage',
      key: 'usedCount',
      render: (c) => `${c.usedCount}${c.usageLimit ? ` / ${c.usageLimit}` : ''}`,
    },
    {
      header: 'Expires',
      key: 'expiresAt',
      render: (c) => (c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'),
    },
    {
      header: 'Status',
      key: 'status',
      render: (c) => <Badge tone={c.status === 'active' ? 'green' : 'slate'}>{c.status}</Badge>,
    },
    {
      header: '',
      key: 'actions',
      className: 'text-right',
      render: (c) => (
        <div className="flex justify-end gap-1">
          <IconButton tone="blue" title="Edit" onClick={() => setModalCoupon(c)}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton tone="red" title="Delete" onClick={() => setDeleteTarget(c)}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Coupons</h1>
        <Button size="sm" onClick={() => setModalCoupon(null)}>
          <Plus className="h-4 w-4" /> Add Coupon
        </Button>
      </div>

      <Card>
        <div className="border-b border-slate-200 p-4">
          <Input aria-label="Search coupons by code"
            placeholder="Search code…"
            className="max-w-xs"
            value={filters.q ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value || undefined, page: 1 }))}
          />
        </div>

        <Table
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(c) => c._id}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          emptyTitle="No coupons yet"
          emptyDescription="Create a coupon to offer discounts at checkout."
        />

        {data?.meta && (
          <Pagination
            page={data.meta.page}
            pages={data.meta.pages}
            onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
          />
        )}
      </Card>

      <CouponFormModal
        isOpen={modalCoupon !== undefined}
        onClose={() => setModalCoupon(undefined)}
        coupon={modalCoupon ?? null}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete coupon"
        description={`Delete "${deleteTarget?.code}"? This can't be undone.`}
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
