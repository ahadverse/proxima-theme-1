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
import { useDeleteStaff, useStaff } from '@/api/staff';
import { useAuthStore } from '@/store/authStore';
import { StaffFormModal } from './StaffFormModal';
import type { StaffMember } from '@/types/staff';

function formatLastLogin(value: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function Staff() {
  const { data: staff, isLoading, isError, refetch } = useStaff();
  const deleteMutation = useDeleteStaff();
  const currentAdminId = useAuthStore((s) => s.admin?.id);
  const [modalMember, setModalMember] = useState<StaffMember | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);

  function handleDelete() {
    if (!deleteTarget) return;
    const name = deleteTarget.name;
    toast.promise(deleteMutation.mutateAsync(deleteTarget.id), {
      loading: `Removing ${name}…`,
      success: () => {
        setDeleteTarget(null);
        return `${name} removed`;
      },
      error: (err) => apiErrorMessage(err, 'Could not remove account'),
    });
  }

  const columns: Column<StaffMember>[] = [
    {
      header: 'Name',
      key: 'name',
      render: (m) => (
        <span className="flex items-center gap-2 font-medium text-slate-800">
          {m.name}
          {m.id === currentAdminId && <Badge tone="blue">You</Badge>}
        </span>
      ),
    },
    { header: 'Email', key: 'email' },
    {
      header: 'Role',
      key: 'role',
      render: (m) => (
        <Badge tone={m.role === 'super-admin' ? 'amber' : 'slate'}>
          {m.role === 'super-admin' ? 'Super-admin' : 'Staff'}
        </Badge>
      ),
    },
    {
      header: 'Status',
      key: 'isActive',
      render: (m) => <Badge tone={m.isActive ? 'green' : 'red'}>{m.isActive ? 'Active' : 'Deactivated'}</Badge>,
    },
    { header: 'Last sign-in', key: 'lastLoginAt', render: (m) => formatLastLogin(m.lastLoginAt) },
    {
      header: '',
      key: 'actions',
      className: 'text-right',
      render: (m) => (
        <div className="flex justify-end gap-1">
          <IconButton tone="blue" title="Edit" onClick={() => setModalMember(m)}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton
            tone="red"
            title={m.id === currentAdminId ? "You can't remove your own account" : 'Remove'}
            disabled={m.id === currentAdminId}
            className="disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => setDeleteTarget(m)}
          >
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
          <h1 className="text-2xl font-bold text-slate-900">Staff</h1>
          <p className="mt-1 text-sm text-slate-500">Everyone who can sign in to this admin panel.</p>
        </div>
        <Button size="sm" onClick={() => setModalMember(null)}>
          <Plus className="h-4 w-4" /> Add Staff
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          rows={staff ?? []}
          rowKey={(m) => m.id}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          emptyTitle="No staff accounts"
        />
      </Card>

      <StaffFormModal
        isOpen={modalMember !== undefined}
        onClose={() => setModalMember(undefined)}
        member={modalMember ?? null}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Remove account"
        confirmLabel="Remove"
        description={`Remove ${deleteTarget?.name}'s account? They will lose access immediately. To keep the account but block sign-in, deactivate it instead.`}
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
