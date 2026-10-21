import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { apiErrorMessage } from '@/lib/api';
import { useDeleteFaq, useFaqs } from '@/api/faq';
import { FaqFormModal } from './FaqFormModal';
import type { Faq as FaqItem } from '@/types/faq';

export default function Faq() {
  const { data: faqs, isLoading, isError, refetch } = useFaqs();
  const deleteMutation = useDeleteFaq();
  const [modalFaq, setModalFaq] = useState<FaqItem | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<FaqItem | null>(null);

  const nextSortOrder = (faqs ?? []).reduce((max, f) => Math.max(max, f.sortOrder + 1), 0);

  function handleDelete() {
    if (!deleteTarget) return;
    toast.promise(deleteMutation.mutateAsync(deleteTarget._id), {
      loading: 'Deleting question…',
      success: () => {
        setDeleteTarget(null);
        return 'Question deleted';
      },
      error: (err) => apiErrorMessage(err, 'Could not delete question'),
    });
  }

  const columns: Column<FaqItem>[] = [
    { header: 'Order', key: 'sortOrder', className: 'w-16' },
    {
      header: 'Question',
      key: 'question',
      render: (f) => (
        <div className="max-w-xl">
          <p className="font-medium text-slate-800">{f.question}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{f.answer}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (f) => <Badge tone={f.status === 'active' ? 'green' : 'slate'}>{f.status}</Badge>,
    },
    {
      header: '',
      key: 'actions',
      className: 'text-right',
      render: (f) => (
        <div className="flex justify-end gap-1">
          <IconButton tone="blue" title="Edit" onClick={() => setModalFaq(f)}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton tone="red" title="Delete" onClick={() => setDeleteTarget(f)}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">FAQ</h1>
          <p className="mt-1 text-sm text-slate-500">The questions shown on the storefront's FAQ page.</p>
        </div>
        <Button size="sm" onClick={() => setModalFaq(null)}>
          <Plus className="h-4 w-4" /> Add Question
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          rows={faqs ?? []}
          rowKey={(f) => f._id}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          emptyTitle="No questions yet"
          emptyDescription="Add the questions customers ask most often."
        />
      </Card>

      <FaqFormModal
        isOpen={modalFaq !== undefined}
        onClose={() => setModalFaq(undefined)}
        faq={modalFaq ?? null}
        nextSortOrder={nextSortOrder}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete question"
        description={`Delete "${deleteTarget?.question}"? This can't be undone.`}
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
