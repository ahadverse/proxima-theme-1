import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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
import { useBrands, useDeleteBrand, useReorderBrands } from '@/api/brands';
import { BrandFormModal } from './BrandFormModal';
import type { Brand } from '@/types/brand';

// How many brands the homepage's "Shop by Brand" shows (the storefront's app/page.tsx takes the first 14 active ones).
const HOME_BRAND_COUNT = 14;

const ROW_GRID =
  'grid grid-cols-[1.5rem_minmax(0,1fr)_auto_auto] items-center gap-2 sm:grid-cols-[1.5rem_minmax(0,2fr)_minmax(0,1.5fr)_5.5rem_5rem_4.5rem]';

export default function Brands() {
  const { data: brands, isLoading, isError, refetch } = useBrands();
  const deleteMutation = useDeleteBrand();
  const reorderMutation = useReorderBrands();
  const [modalBrand, setModalBrand] = useState<Brand | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);

  const ordered = useMemo(
    () => [...(brands ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [brands]
  );
  // The last brand the homepage shows: a line is drawn under it so it's clear who makes the cut.
  const lastOnHomepage = ordered.filter((b) => b.status === 'active')[HOME_BRAND_COUNT - 1]?._id;
  const hasMoreThanHomepage = ordered.filter((b) => b.status === 'active').length > HOME_BRAND_COUNT;

  function handleDelete() {
    if (!deleteTarget) return;
    const name = deleteTarget.name;
    toast.promise(deleteMutation.mutateAsync(deleteTarget._id), {
      loading: `Deleting ${name}…`,
      success: () => {
        setDeleteTarget(null);
        return `${name} deleted`;
      },
      error: (err) => apiErrorMessage(err, 'Could not delete brand'),
    });
  }

  function saveOrder(ids: string[]) {
    toast.promise(reorderMutation.mutateAsync(ids), {
      loading: 'Saving order…',
      success: 'Order saved',
      error: (err) => apiErrorMessage(err, 'Could not save the new order'),
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Brands</h1>
          <p className="mt-1 text-sm text-slate-500">
            Drag the grip on the left to change the order. The homepage's "Shop by Brand" shows the first {HOME_BRAND_COUNT} active brands in this order; the All Brands page lists them all.
          </p>
        </div>
        <Button size="sm" onClick={() => setModalBrand(null)}>
          <Plus className="h-4 w-4" /> Add Brand
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState title="Couldn't load the brands" onRetry={() => void refetch()} />
        ) : ordered.length === 0 ? (
          <EmptyState title="No brands yet" description="Add the brands you carry so products can be filtered by them." />
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
              items={ordered}
              getId={(b) => b._id}
              getLabel={(b) => b.name}
              onReorder={saveOrder}
              renderItem={(brand, handle) => (
                <>
                  <div className={`${ROW_GRID} px-3 py-2.5 transition-colors hover:bg-slate-200/40`}>
                    {handle}
                    <div className="flex min-w-0 items-center gap-2">
                      {brand.logo && <img src={brand.logo} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />}
                      <span className="truncate font-medium text-slate-800">{brand.name}</span>
                    </div>
                    <span className="hidden truncate text-sm text-slate-500 sm:block">{brand.slug}</span>
                    <span className="hidden sm:block">{brand.isFeatured && <Badge tone="blue">Featured</Badge>}</span>
                    <Badge tone={brand.status === 'active' ? 'green' : 'slate'}>{brand.status}</Badge>
                    <div className="flex justify-end gap-1">
                      <IconButton tone="blue" title="Edit" aria-label={`Edit ${brand.name}`} onClick={() => setModalBrand(brand)}>
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      <IconButton tone="red" title="Delete" aria-label={`Delete ${brand.name}`} onClick={() => setDeleteTarget(brand)}>
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </div>
                  {hasMoreThanHomepage && brand._id === lastOnHomepage && (
                    <div className="flex items-center gap-2 border-t-2 border-dashed border-brand-accent/60 bg-brand-accent/5 px-3 py-1.5 text-xs font-medium text-slate-500">
                      Above this line: shown on the homepage. Below: only on the All Brands page.
                    </div>
                  )}
                </>
              )}
            />
          </>
        )}
      </Card>

      <BrandFormModal
        isOpen={modalBrand !== undefined}
        onClose={() => setModalBrand(undefined)}
        brand={modalBrand ?? null}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete brand"
        description={`Delete "${deleteTarget?.name}"? Products referencing this brand will keep a dangling reference.`}
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
