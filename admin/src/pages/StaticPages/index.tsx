import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { apiErrorMessage } from '@/lib/api';
import { useDeleteStaticPage, useStaticPages } from '@/api/staticPages';
import type { StaticPage } from '@/types/page';

/** Where a page lives on the storefront: built-in pages have their own routes, custom ones live under /pages. */
const pagePath = (page: Pick<StaticPage, 'slug' | 'isSystem'>) =>
  page.isSystem ? `/${page.slug}` : `/pages/${page.slug}`;

export default function StaticPages() {
  const { data: pages, isLoading, isError, refetch } = useStaticPages();
  const deleteMutation = useDeleteStaticPage();
  const [deleteTarget, setDeleteTarget] = useState<StaticPage | null>(null);

  function handleDelete() {
    if (!deleteTarget) return;
    const { title, isSystem } = deleteTarget;
    toast.promise(deleteMutation.mutateAsync(deleteTarget._id), {
      loading: isSystem ? `Resetting ${title}…` : `Deleting ${title}…`,
      success: () => {
        setDeleteTarget(null);
        return isSystem ? `${title} reset to its default text` : `${title} deleted`;
      },
      error: (err) => apiErrorMessage(err, 'Could not delete page'),
    });
  }

  const columns: Column<StaticPage>[] = [
    {
      header: 'Page',
      key: 'title',
      render: (p) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800">{p.title}</span>
          {p.isSystem && <Badge tone="blue">Built-in</Badge>}
        </div>
      ),
    },
    {
      header: 'Address',
      key: 'slug',
      render: (p) => <code className="text-xs text-slate-500">{pagePath(p)}</code>,
    },
    { header: 'Last edited', key: 'updatedAt', render: (p) => new Date(p.updatedAt).toLocaleDateString() },
    {
      header: '',
      key: 'actions',
      className: 'text-right',
      render: (p) => (
        <div className="flex justify-end gap-1">
          <Link
            to={`/pages/${p._id}/edit`}
            title="Edit"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 transition-all hover:bg-blue-50 hover:text-blue-700 active:scale-90 dark:text-blue-400 dark:hover:bg-blue-500/15 dark:hover:text-blue-300"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <IconButton
            tone="red"
            title={p.isSystem ? 'Delete (restores the default text)' : 'Delete'}
            aria-label={`Delete ${p.title}`}
            onClick={() => setDeleteTarget(p)}
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
          <h1 className="text-2xl font-bold text-slate-900">Static Pages</h1>
          <p className="mt-1 text-sm text-slate-500">
            About, policies and any other pages of text. Choose which of them appear in the footer under{' '}
            <Link to="/settings?tab=footer" className="font-medium underline underline-offset-2 hover:text-slate-800">
              Settings → Footer
            </Link>
            .
          </p>
        </div>
        <Link
          to="/pages/new"
          className="brand-gradient inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-medium text-brand-on-primary shadow-sm ring-1 ring-inset ring-white/10 transition-all hover:brightness-110 active:brightness-95"
        >
          <Plus className="h-4 w-4" /> Add Page
        </Link>
      </div>

      <Card>
        <Table
          columns={columns}
          rows={pages ?? []}
          rowKey={(p) => p._id}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          emptyTitle="No pages yet"
        />
      </Card>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete page"
        description={
          deleteTarget?.isSystem
            ? `"${deleteTarget.title}" is a built-in page. Deleting your version puts the store's default text back — the page itself stays, and so do footer links to it. This can't be undone.`
            : `Delete "${deleteTarget?.title}"? Its links in the footer menu are removed too, and anyone with the address will see "not found". This can't be undone.`
        }
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
