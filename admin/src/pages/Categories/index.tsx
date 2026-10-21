import { useMemo, useState } from 'react';
import { ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { SortableList } from '@/components/ui/SortableList';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { apiErrorMessage } from '@/lib/api';
import { useCategories, useDeleteCategory, useReorderCategories } from '@/api/categories';
import { CategoryFormModal } from './CategoryFormModal';
import type { Category } from '@/types/category';

// One row: the grip, the name, then (on wider screens) slug and "Featured", the status and the buttons.
const ROW_GRID =
  'grid grid-cols-[1.5rem_minmax(0,1fr)_auto_auto] items-center gap-2 sm:grid-cols-[1.5rem_minmax(0,2fr)_minmax(0,1.5fr)_5.5rem_5rem_4.5rem]';

/** Siblings in the order the storefront shows them (the order set by dragging, then by name). */
const inOrder = (list: Category[]) => [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

export default function Categories() {
  const { data: categories, isLoading, isError, refetch } = useCategories();
  const deleteMutation = useDeleteCategory();
  const reorderMutation = useReorderCategories();
  const [modalCategory, setModalCategory] = useState<Category | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  // Which categories show their subcategories. They start folded away, so the top-level categories — the ones in the
  // header menu — sit close together and are easy to drag.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const { roots, childrenOf } = useMemo(() => {
    const byParent = new Map<string | null, Category[]>();
    for (const cat of categories ?? []) {
      const key = cat.parent ?? null;
      byParent.set(key, [...(byParent.get(key) ?? []), cat]);
    }
    return {
      roots: inOrder(byParent.get(null) ?? []),
      childrenOf: (id: string) => inOrder(byParent.get(id) ?? []),
    };
  }, [categories]);

  const parentIds = (categories ?? []).filter((c) => (categories ?? []).some((child) => child.parent === c._id)).map((c) => c._id);
  const allExpanded = parentIds.length > 0 && parentIds.every((id) => expanded.has(id));

  function toggle(id: string) {
    setExpanded((open) => {
      const next = new Set(open);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const name = deleteTarget.name;
    toast.promise(deleteMutation.mutateAsync(deleteTarget._id), {
      loading: `Deleting ${name}…`,
      success: () => {
        setDeleteTarget(null);
        return `${name} deleted`;
      },
      error: (err) => apiErrorMessage(err, 'Could not delete category'),
    });
  }

  function saveOrder(parent: string | null, ids: string[]) {
    toast.promise(reorderMutation.mutateAsync({ ids, parent }), {
      loading: 'Saving order…',
      success: 'Order saved — the menu follows it',
      error: (err) => apiErrorMessage(err, 'Could not save the new order'),
    });
  }

  function row(category: Category, depth: 0 | 1 | 2, handle: React.ReactNode) {
    const childCount = childrenOf(category._id).length;
    const isOpen = expanded.has(category._id);
    return (
      <div className={`${ROW_GRID} px-3 py-2.5 transition-colors hover:bg-slate-200/40`}>
        {handle}
        <div className="flex min-w-0 items-center gap-2">
          {childCount > 0 ? (
            <button
              type="button"
              onClick={() => toggle(category._id)}
              aria-expanded={isOpen}
              aria-label={`${isOpen ? 'Hide' : 'Show'} the ${childCount} subcategories of ${category.name}`}
              className="inline-flex h-6 shrink-0 items-center gap-0.5 rounded-md px-1 text-xs text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
            >
              <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              {childCount}
            </button>
          ) : (
            <span className="w-[2.1rem] shrink-0" aria-hidden />
          )}
          {category.image && <img src={category.image} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />}
          <span className={depth === 0 ? 'truncate font-semibold text-slate-800' : 'truncate font-medium text-slate-700'}>{category.name}</span>
        </div>
        <span className="hidden truncate text-sm text-slate-500 sm:block">{category.slug}</span>
        <span className="hidden sm:block">{category.isFeatured && <Badge tone="blue">Featured</Badge>}</span>
        <Badge tone={category.status === 'active' ? 'green' : 'slate'}>{category.status}</Badge>
        <div className="flex justify-end gap-1">
          <IconButton tone="blue" title="Edit" aria-label={`Edit ${category.name}`} onClick={() => setModalCategory(category)}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton tone="red" title="Delete" aria-label={`Delete ${category.name}`} onClick={() => setDeleteTarget(category)}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
    );
  }

  // Subcategories are ordered inside their own category: each list is its own drag area, so one can't be dropped under another parent.
  function subtree(parent: Category, depth: 1 | 2): React.ReactNode {
    const children = childrenOf(parent._id);
    if (children.length === 0 || !expanded.has(parent._id)) return null;
    return (
      <SortableList
        className="ml-6 border-l border-slate-200 pl-1"
        items={children}
        getId={(c) => c._id}
        getLabel={(c) => c.name}
        onReorder={(ids) => saveOrder(parent._id, ids)}
        renderItem={(child, handle) => (
          <>
            {row(child, depth, handle)}
            {depth === 1 && subtree(child, 2)}
          </>
        )}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
          <p className="mt-1 text-sm text-slate-500">
            Drag the grip on the left to change the order. The storefront's menu follows it, top to bottom; subcategories are ordered inside their own category (use the arrow beside a category to open them).
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {parentIds.length > 0 && (
            <Button variant="secondary" size="sm" onClick={() => setExpanded(allExpanded ? new Set() : new Set(parentIds))}>
              {allExpanded ? 'Fold all' : 'Show all subcategories'}
            </Button>
          )}
          <Button size="sm" onClick={() => setModalCategory(null)}>
            <Plus className="h-4 w-4" /> Add Category
          </Button>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState title="Couldn't load the categories" onRetry={() => void refetch()} />
        ) : roots.length === 0 ? (
          <EmptyState title="No categories yet" description="Create your first category to start organizing products." />
        ) : (
          <>
            <div className={`${ROW_GRID} border-b border-slate-200 px-3 py-3 text-xs font-medium tracking-wide text-slate-400 uppercase`} aria-hidden>
              <span />
              <span>Name</span>
              <span className="hidden sm:block">Slug</span>
              <span className="hidden sm:block">Featured</span>
              <span>Status</span>
              <span />
            </div>
            <SortableList
              className="divide-y divide-slate-200"
              items={roots}
              getId={(c) => c._id}
              getLabel={(c) => c.name}
              onReorder={(ids) => saveOrder(null, ids)}
              renderItem={(category, handle) => (
                <>
                  {row(category, 0, handle)}
                  {subtree(category, 1)}
                </>
              )}
            />
          </>
        )}
      </Card>

      <CategoryFormModal
        isOpen={modalCategory !== undefined}
        onClose={() => setModalCategory(undefined)}
        category={modalCategory ?? null}
        categories={categories ?? []}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete category"
        description={`Delete "${deleteTarget?.name}"? This can't be undone.`}
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
