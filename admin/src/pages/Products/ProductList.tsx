import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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
import { useCategories } from '@/api/categories';
import { useDeleteProduct, useProductsAdmin, type ProductListFilters } from '@/api/products';
import type { Product } from '@/types/product';

const stockTone: Record<Product['stockStatus'], 'green' | 'amber' | 'red'> = {
  in_stock: 'green',
  low_stock: 'amber',
  out_of_stock: 'red',
};

const statusTone: Record<Product['status'], 'green' | 'slate' | 'red'> = {
  active: 'green',
  draft: 'slate',
  archived: 'red',
};

export default function ProductList() {
  const { data: categories } = useCategories();
  const deleteMutation = useDeleteProduct();
  const [filters, setFilters] = useState<ProductListFilters>({ page: 1, limit: 20 });
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const { data, isLoading, isError, refetch } = useProductsAdmin(filters);

  function handleDelete() {
    if (!deleteTarget) return;
    const title = deleteTarget.title;
    toast.promise(deleteMutation.mutateAsync(deleteTarget._id), {
      loading: `Deleting ${title}…`,
      success: () => {
        setDeleteTarget(null);
        return `${title} deleted`;
      },
      error: (err) => apiErrorMessage(err, 'Could not delete product'),
    });
  }

  const columns: Column<Product>[] = [
    {
      header: 'Product',
      key: 'title',
      render: (p) => (
        <div className="flex items-center gap-3">
          {p.images[0] && (
            <img src={p.images[0].url} alt="" className="h-10 w-10 rounded-lg object-cover" />
          )}
          <div>
            <p className="font-medium text-slate-800">{p.title}</p>
            <p className="text-xs text-slate-400">{typeof p.category === 'string' ? '' : p.category.name}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Price',
      key: 'basePrice',
      render: (p) => <span>৳{p.basePrice.toLocaleString()}</span>,
    },
    {
      header: 'Stock',
      key: 'stockStatus',
      render: (p) => (
        <Badge tone={stockTone[p.stockStatus]}>
          {p.productType === 'variable' ? 'variants' : p.stock} · {p.stockStatus.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (p) => <Badge tone={statusTone[p.status]}>{p.status}</Badge>,
    },
    {
      header: '',
      key: 'actions',
      className: 'text-right',
      render: (p) => (
        <div className="flex justify-end gap-1">
          <Link
            to={`/products/${p._id}/edit`}
            title="Edit"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 transition-all hover:bg-blue-50 hover:text-blue-700 active:scale-90 dark:text-blue-400 dark:hover:bg-blue-500/15 dark:hover:text-blue-300"
          >
            <Pencil className="h-4 w-4" />
          </Link>
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
        <h1 className="text-2xl font-bold text-slate-900">Products</h1>
        <Link
          to="/products/new"
          className="brand-gradient inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-medium text-brand-on-primary shadow-sm ring-1 ring-inset ring-white/10 transition-all hover:brightness-110 active:brightness-95"
        >
          <Plus className="h-4 w-4" /> Add Product
        </Link>
      </div>

      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-200 p-4">
          <Input aria-label="Search products"
            placeholder="Search products…"
            className="max-w-xs"
            value={filters.q ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value || undefined, page: 1 }))}
          />
          <Select aria-label="Filter by category"
            className="max-w-[200px]"
            value={filters.category ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value || undefined, page: 1 }))}
          >
            <option value="">All categories</option>
            {categories?.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </Select>
          <Select aria-label="Filter by status"
            className="max-w-[160px]"
            value={filters.status ?? ''}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: (e.target.value || undefined) as ProductListFilters['status'], page: 1 }))
            }
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </Select>
        </div>

        <Table
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(p) => p._id}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          emptyTitle="No products yet"
          emptyDescription="Add your first product to start building the catalog."
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
        title="Delete product"
        description={`Delete "${deleteTarget?.title}"? This can't be undone.`}
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
