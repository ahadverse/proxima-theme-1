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
import { useAttributes, useDeleteAttribute } from '@/api/attributes';
import { AttributeFormModal } from './AttributeFormModal';
import type { Attribute } from '@/types/attribute';

export default function Attributes() {
  const { data: attributes, isLoading, isError, refetch } = useAttributes();
  const deleteMutation = useDeleteAttribute();
  const [modalAttribute, setModalAttribute] = useState<Attribute | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Attribute | null>(null);

  function handleDelete() {
    if (!deleteTarget) return;
    const name = deleteTarget.name;
    toast.promise(deleteMutation.mutateAsync(deleteTarget._id), {
      loading: `Deleting ${name}…`,
      success: () => {
        setDeleteTarget(null);
        return `${name} deleted`;
      },
      error: (err) => apiErrorMessage(err, 'Could not delete attribute'),
    });
  }

  const columns: Column<Attribute>[] = [
    { header: 'Name', key: 'name', render: (a) => <span className="font-medium text-slate-800">{a.name}</span> },
    { header: 'Slug', key: 'slug' },
    {
      header: 'Type',
      key: 'type',
      render: (a) => <Badge tone={a.type === 'color' ? 'blue' : 'slate'}>{a.type}</Badge>,
    },
    {
      header: 'Values',
      key: 'values',
      render: (a) => (
        <span className="text-slate-500">
          {a.values.length} value{a.values.length === 1 ? '' : 's'}
        </span>
      ),
    },
    {
      header: '',
      key: 'actions',
      className: 'text-right',
      render: (a) => (
        <div className="flex justify-end gap-1">
          <IconButton tone="blue" title="Edit" onClick={() => setModalAttribute(a)}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton tone="red" title="Delete" onClick={() => setDeleteTarget(a)}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Attributes</h1>
        <Button size="sm" onClick={() => setModalAttribute(null)}>
          <Plus className="h-4 w-4" /> Add Attribute
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          rows={attributes ?? []}
          rowKey={(a) => a._id}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          emptyTitle="No attributes yet"
          emptyDescription="Attributes like Color, Storage, and RAM drive the Variant Builder on products."
        />
      </Card>

      <AttributeFormModal
        isOpen={modalAttribute !== undefined}
        onClose={() => setModalAttribute(undefined)}
        attribute={modalAttribute ?? null}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete attribute"
        description={`Delete "${deleteTarget?.name}"? Variants already using it will keep a dangling reference.`}
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
