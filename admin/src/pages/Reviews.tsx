import { useState } from 'react';
import { Check, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Select } from '@/components/ui/Select';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { apiErrorMessage } from '@/lib/api';
import { useApproveReview, useDeleteReview, useReviewsAdmin, type ReviewFilters } from '@/api/reviews';
import type { Review } from '@/types/review';

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < rating ? 'fill-amber-400' : 'text-slate-200'}`} />
      ))}
    </span>
  );
}

export default function Reviews() {
  const [filters, setFilters] = useState<ReviewFilters>({ page: 1, limit: 20 });
  const { data, isLoading, isError, refetch } = useReviewsAdmin(filters);
  const approveMutation = useApproveReview();
  const deleteMutation = useDeleteReview();
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);

  function handleApprove(review: Review) {
    toast.promise(approveMutation.mutateAsync(review._id), {
      loading: 'Approving…',
      success: 'Review approved',
      error: (err) => apiErrorMessage(err, 'Could not approve review'),
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    toast.promise(deleteMutation.mutateAsync(deleteTarget._id), {
      loading: 'Removing…',
      success: () => {
        setDeleteTarget(null);
        return 'Review removed';
      },
      error: (err) => apiErrorMessage(err, 'Could not remove review'),
    });
  }

  const columns: Column<Review>[] = [
    {
      header: 'Product',
      key: 'product',
      // A review outlives its product when the product is deleted; the API then sends `product: null`.
      render: (r) =>
        r.product ? (
          <span className="font-medium text-slate-800">{r.product.title}</span>
        ) : (
          <span className="italic text-slate-500">Deleted product</span>
        ),
    },
    { header: 'Customer', key: 'customer', render: (r) => r.customer.name },
    { header: 'Rating', key: 'rating', render: (r) => <Stars rating={r.rating} /> },
    {
      header: 'Review',
      key: 'comment',
      render: (r) => (
        <div className="max-w-xs">
          {r.title && <p className="font-medium text-slate-700">{r.title}</p>}
          <p className="truncate text-slate-500">{r.comment}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'isApproved',
      render: (r) => <Badge tone={r.isApproved ? 'green' : 'amber'}>{r.isApproved ? 'Approved' : 'Pending'}</Badge>,
    },
    { header: 'Date', key: 'createdAt', render: (r) => new Date(r.createdAt).toLocaleDateString() },
    {
      header: '',
      key: 'actions',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1">
          {!r.isApproved && (
            <IconButton tone="emerald" title="Approve" onClick={() => handleApprove(r)}>
              <Check className="h-4 w-4" />
            </IconButton>
          )}
          <IconButton tone="red" title="Remove" onClick={() => setDeleteTarget(r)}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Reviews</h1>

      <Card>
        <div className="border-b border-slate-200 p-4">
          <Select aria-label="Filter by approval"
            className="max-w-[180px]"
            value={filters.isApproved ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                isApproved: (e.target.value || undefined) as ReviewFilters['isApproved'],
                page: 1,
              }))
            }
          >
            <option value="">All reviews</option>
            <option value="false">Pending approval</option>
            <option value="true">Approved</option>
          </Select>
        </div>

        <Table
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(r) => r._id}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          emptyTitle="No reviews yet"
          emptyDescription="Reviews submitted by customers will show up here for moderation."
        />

        {data?.meta && (
          <Pagination
            page={data.meta.page}
            pages={data.meta.pages}
            onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
          />
        )}
      </Card>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Remove review"
        description="Remove this review? This can't be undone."
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
