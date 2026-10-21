import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EyeOff, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { apiErrorMessage } from '@/lib/api';
import { useBlogPosts, useDeleteBlogPost, useSetBlogPublished, type BlogFilters } from '@/api/blog';
import type { BlogPost } from '@/types/blog';

export default function BlogList() {
  const [filters, setFilters] = useState<BlogFilters>({ page: 1, limit: 20 });
  const { data, isLoading, isError, refetch } = useBlogPosts(filters);
  const deleteMutation = useDeleteBlogPost();
  const publishMutation = useSetBlogPublished();
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);

  function handleDelete() {
    if (!deleteTarget) return;
    const title = deleteTarget.title;
    toast.promise(deleteMutation.mutateAsync(deleteTarget._id), {
      loading: `Deleting ${title}…`,
      success: () => {
        setDeleteTarget(null);
        return 'Post deleted';
      },
      error: (err) => apiErrorMessage(err, 'Could not delete post'),
    });
  }

  function togglePublished(post: BlogPost) {
    const published = post.status !== 'published';
    toast.promise(publishMutation.mutateAsync({ id: post._id, published }), {
      loading: published ? 'Publishing…' : 'Unpublishing…',
      success: published ? 'Post published' : 'Post moved back to drafts',
      error: (err) => apiErrorMessage(err, 'Could not change the post'),
    });
  }

  const columns: Column<BlogPost>[] = [
    {
      header: 'Post',
      key: 'title',
      render: (p) => (
        <div className="flex items-center gap-3">
          {p.coverImage ? (
            <img src={p.coverImage} alt="" className="h-10 w-14 shrink-0 rounded-md object-cover" />
          ) : (
            <div className="h-10 w-14 shrink-0 rounded-md bg-slate-200" />
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-800">{p.title}</p>
            <p className="truncate text-xs text-slate-400">
              /blog/{p.slug}
              {p.author?.name ? ` · ${p.author.name}` : ''}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: 'Tags',
      key: 'tags',
      render: (p) =>
        p.tags.length === 0 ? (
          <span className="text-slate-400">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {p.tags.slice(0, 3).map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
            {p.tags.length > 3 && <span className="text-xs text-slate-400">+{p.tags.length - 3}</span>}
          </div>
        ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (p) => <Badge tone={p.status === 'published' ? 'green' : 'amber'}>{p.status}</Badge>,
    },
    {
      header: 'Published',
      key: 'publishedAt',
      render: (p) => (p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : '—'),
    },
    {
      header: '',
      key: 'actions',
      className: 'text-right',
      render: (p) => (
        <div className="flex justify-end gap-1">
          <Link
            to={`/blog/${p._id}/edit`}
            title="Edit"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 transition-all hover:bg-blue-50 hover:text-blue-700 active:scale-90 dark:text-blue-400 dark:hover:bg-blue-500/15 dark:hover:text-blue-300"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <IconButton
            tone={p.status === 'published' ? 'amber' : 'emerald'}
            title={p.status === 'published' ? 'Unpublish' : 'Publish'}
            onClick={() => togglePublished(p)}
          >
            {p.status === 'published' ? <EyeOff className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </IconButton>
          <IconButton tone="red" title="Delete" onClick={() => setDeleteTarget(p)}>
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
          <h1 className="text-2xl font-bold text-slate-900">Blog</h1>
          <p className="mt-1 text-sm text-slate-500">Articles for your storefront's blog. Drafts stay private.</p>
        </div>
        <Link
          to="/blog/new"
          className="brand-gradient inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-medium text-brand-on-primary shadow-sm ring-1 ring-inset ring-white/10 transition-all hover:brightness-110 active:brightness-95"
        >
          <Plus className="h-4 w-4" /> New Post
        </Link>
      </div>

      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-200 p-4">
          <Input aria-label="Search posts"
            placeholder="Search posts…"
            className="max-w-xs"
            value={filters.q ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value || undefined, page: 1 }))}
          />
          <Select aria-label="Filter by status"
            className="max-w-[160px]"
            value={filters.status ?? ''}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: (e.target.value || undefined) as BlogFilters['status'], page: 1 }))
            }
          >
            <option value="">Any status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </Select>
        </div>

        <Table
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(p) => p._id}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          emptyTitle="No posts yet"
          emptyDescription="Write your first article — buying guides and tips bring visitors in from search."
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
        title="Delete post"
        description={`Delete "${deleteTarget?.title}"? This can't be undone.`}
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
