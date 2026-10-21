import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState } from '@/components/ui/ErrorState';
import { apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useBanners, useDeleteBanner } from '@/api/banners';
import { BannerFormModal } from './BannerFormModal';
import { HomepagePreview } from './HomepagePreview';
import { BANNER_SECTIONS, BANNER_TYPE_INFO, bannerState } from './bannerTypes';
import type { Banner, BannerType } from '@/types/banner';

type StatusFilter = 'active' | 'inactive' | undefined;

const PREVIEW_KEY = 'maroon-banners-preview';

/** One placement's banners in a table; the placement is the table's section, so it isn't a column. */
function bannerColumns(onEdit: (b: Banner) => void, onDelete: (b: Banner) => void): Column<Banner>[] {
  return [
    {
      header: 'Banner',
      key: 'image',
      render: (b) => (
        <div className="flex items-center gap-3">
          <img
            src={b.image}
            alt=""
            className={cn('h-10 shrink-0 bg-slate-200 object-cover', b.type === 'category_icon' ? 'w-10 rounded-lg' : 'w-20 rounded-md')}
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-800">{b.title || <span className="text-slate-400">Image only</span>}</p>
            {b.subtitle && <p className="truncate text-xs text-slate-400">{b.subtitle}</p>}
          </div>
        </div>
      ),
    },
    { header: 'Order', key: 'sortOrder' },
    {
      header: 'Status',
      key: 'status',
      render: (b) => {
        const state = bannerState(b);
        return (
          <div>
            <Badge tone={state.tone}>{state.label}</Badge>
            {state.detail && <p className="mt-0.5 text-xs text-slate-400">{state.detail}</p>}
          </div>
        );
      },
    },
    {
      header: '',
      key: 'actions',
      className: 'text-right',
      render: (b) => (
        <div className="flex justify-end gap-1">
          <IconButton tone="blue" title="Edit" onClick={() => onEdit(b)}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton tone="red" title="Delete" onClick={() => onDelete(b)}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      ),
    },
  ];
}

export default function Banners() {
  const [status, setStatus] = useState<StatusFilter>();
  const { data, isLoading, isError, refetch } = useBanners({});
  const deleteMutation = useDeleteBanner();
  const [modalBanner, setModalBanner] = useState<Banner | null | undefined>(undefined);
  const [addType, setAddType] = useState<BannerType | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const [flash, setFlash] = useState<BannerType | undefined>();
  const flashTimer = useRef<number>(0);

  // The preview can be put away; the choice is remembered in this browser only.
  const [showPreview, setShowPreview] = useState(() => {
    try {
      return localStorage.getItem(PREVIEW_KEY) !== 'hidden';
    } catch {
      return true;
    }
  });
  function togglePreview() {
    setShowPreview((open) => {
      try {
        localStorage.setItem(PREVIEW_KEY, open ? 'hidden' : 'shown');
      } catch {
        // Storage blocked — the choice just isn't remembered.
      }
      return !open;
    });
  }
  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const banners = useMemo(() => data ?? [], [data]);
  const byType = useMemo(() => {
    const groups = new Map<BannerType, Banner[]>();
    for (const b of banners) {
      if (status && b.status !== status) continue;
      groups.set(b.type, [...(groups.get(b.type) ?? []), b]);
    }
    for (const list of groups.values()) list.sort((a, b) => a.sortOrder - b.sortOrder);
    return groups;
  }, [banners, status]);

  function add(type?: BannerType) {
    setAddType(type);
    setModalBanner(null);
  }

  /** From the preview: jump to that placement's block and mark it for a moment. */
  function goTo(type: BannerType) {
    document.getElementById(`placement-${type}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlash(type);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(undefined), 2200);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    toast.promise(deleteMutation.mutateAsync(deleteTarget._id), {
      loading: 'Deleting banner…',
      success: () => {
        setDeleteTarget(null);
        return 'Banner deleted';
      },
      error: (err) => apiErrorMessage(err, 'Could not delete banner'),
    });
  }

  const columns = bannerColumns(setModalBanner, setDeleteTarget);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Banners</h1>
          <p className="mt-1 text-sm text-slate-500">
            The images on your storefront's homepage, section by section from the top of the page down. Changes show on the next page load.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select aria-label="Filter by status" className="w-36" value={status ?? ''} onChange={(e) => setStatus((e.target.value || undefined) as StatusFilter)}>
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <Button size="sm" onClick={() => add(undefined)}>
            <Plus className="h-4 w-4" /> Add Banner
          </Button>
        </div>
      </div>

      {isError && !data ? (
        <Card>
          <ErrorState title="Couldn't load the banners" onRetry={() => void refetch()} />
        </Card>
      ) : (
        <div className="space-y-6">
          {/* A look at the homepage with your live banners in place */}
          <Card>
            <CardHeader className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Homepage preview</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Where each placement sits on the page, with the banners that are live now. Click one to jump to it.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={togglePreview} aria-expanded={showPreview}>
                {showPreview ? (
                  <>
                    <ChevronUp className="h-4 w-4" /> Hide
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" /> Show
                  </>
                )}
              </Button>
            </CardHeader>
            {showPreview && (
              <div className="p-4">
                {isLoading ? (
                  <Skeleton className="mx-auto h-72 w-full max-w-3xl" />
                ) : (
                  <HomepagePreview banners={banners} selected={flash} onSelect={goTo} onAdd={add} />
                )}
              </div>
            )}
          </Card>

          {/* The page, divided into its sections */}
          {BANNER_SECTIONS.map((section, index) => {
            const total = section.types.reduce((n, t) => n + (byType.get(t)?.length ?? 0), 0);
            return (
              <section key={section.key} id={`section-${section.key}`} aria-labelledby={`section-${section.key}-title`} className="scroll-mt-4">
                <Card>
                  <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600" aria-hidden>
                        {index + 1}
                      </span>
                      <div>
                        <h2 id={`section-${section.key}-title`} className="text-base font-semibold text-slate-900">
                          {section.title}
                        </h2>
                        <p className="text-sm text-slate-500">{section.description}</p>
                      </div>
                    </div>
                    <Badge tone={total > 0 ? 'blue' : 'slate'}>
                      {total} banner{total === 1 ? '' : 's'}
                    </Badge>
                  </CardHeader>

                  <div className="divide-y divide-slate-200">
                    {section.types.map((type) => {
                      const info = BANNER_TYPE_INFO[type];
                      const rows = byType.get(type) ?? [];
                      return (
                        <div
                          key={type}
                          id={`placement-${type}`}
                          className={cn('scroll-mt-4 transition-colors duration-500', flash === type && 'bg-amber-500/10')}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge tone={info.tone}>{info.label}</Badge>
                                <span className="text-xs text-slate-400">Suggested size {info.size}</span>
                              </div>
                              <p className="mt-1 text-sm text-slate-500">{info.where}</p>
                            </div>
                            <Button variant="secondary" size="sm" onClick={() => add(type)}>
                              <Plus className="h-4 w-4" /> Add {info.label.toLowerCase()}
                            </Button>
                          </div>

                          {isLoading ? (
                            <div className="px-5 pb-4">
                              <Skeleton className="h-14 w-full" />
                            </div>
                          ) : rows.length > 0 ? (
                            <Table columns={columns} rows={rows} rowKey={(b) => b._id} />
                          ) : (
                            <div className="px-5 pb-4">
                              <div className="rounded-lg border border-dashed border-slate-300 px-4 py-5 text-center">
                                <p className="text-sm font-medium text-slate-600">
                                  {status ? `No ${status} banners here` : 'No banners here yet'}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-400">{info.whenEmpty}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </section>
            );
          })}
        </div>
      )}

      <BannerFormModal
        isOpen={modalBanner !== undefined}
        onClose={() => setModalBanner(undefined)}
        banner={modalBanner ?? null}
        defaultType={addType}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete banner"
        description={`Delete this ${deleteTarget ? BANNER_TYPE_INFO[deleteTarget.type].label.toLowerCase() : ''} banner${deleteTarget?.title ? ` ("${deleteTarget.title}")` : ''}? This can't be undone.`}
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
