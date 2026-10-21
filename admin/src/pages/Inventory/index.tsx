import { useState } from 'react';
import { Boxes, History, Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Segmented } from '@/components/ui/Segmented';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useLowStockProducts, useRecentInventoryLog } from '@/api/inventory';
import { useProductsAdmin } from '@/api/products';
import { AdjustStockModal } from './AdjustStockModal';
import { InventoryLogTable } from './InventoryLogTable';
import { totalStock } from './stock';
import type { Product } from '@/types/product';

type View = 'low' | 'all' | 'log';

const stockTone: Record<Product['stockStatus'], 'green' | 'amber' | 'red'> = {
  in_stock: 'green',
  low_stock: 'amber',
  out_of_stock: 'red',
};

function stockColumns(onAdjust: (product: Product) => void): Column<Product>[] {
  return [
    {
      header: 'Product',
      key: 'title',
      render: (p) => (
        <div className="flex items-center gap-3">
          {p.images[0] && <img src={p.images[0].url} alt="" className="h-10 w-10 rounded-lg object-cover" />}
          <span className="font-medium text-slate-800">{p.title}</span>
        </div>
      ),
    },
    {
      header: 'Stock',
      key: 'stock',
      render: (p) =>
        p.productType === 'variable' ? (
          <span>
            {totalStock(p)} <span className="text-xs text-slate-500">across {p.variants.length} variants</span>
          </span>
        ) : (
          p.stock
        ),
    },
    {
      header: 'Low-stock at',
      key: 'lowStockThreshold',
      render: (p) => (p.productType === 'variable' ? '—' : p.lowStockThreshold),
    },
    {
      header: 'Status',
      key: 'stockStatus',
      render: (p) => <Badge tone={stockTone[p.stockStatus]}>{p.stockStatus.replace(/_/g, ' ')}</Badge>,
    },
    {
      header: '',
      key: 'actions',
      className: 'text-right',
      render: (p) => (
        <div className="flex justify-end">
          <IconButton tone="blue" title={`Adjust stock of ${p.title}`} onClick={() => onAdjust(p)}>
            <History className="h-4 w-4" />
          </IconButton>
        </div>
      ),
    },
  ];
}

function LowStockView({ onAdjust }: { onAdjust: (product: Product) => void }) {
  const { data: products, isLoading, isError, refetch } = useLowStockProducts();
  return (
    <Card>
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 text-sm text-slate-500">
        <Boxes className="h-4 w-4" aria-hidden /> Products running low or out of stock
      </div>
      <Table
        columns={stockColumns(onAdjust)}
        rows={products ?? []}
        rowKey={(p) => p._id}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        emptyTitle="Nothing is low on stock"
        emptyDescription="Every product is above its low-stock threshold right now."
      />
    </Card>
  );
}

function AllProductsView({ onAdjust }: { onAdjust: (product: Product) => void }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim(), 300);
  const { data, isLoading, isError, refetch } = useProductsAdmin({ q: q || undefined, page, limit: 15 });

  return (
    <Card>
      <div className="flex items-center gap-2 border-b border-slate-200 p-4">
        <Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        <Input
          aria-label="Search products"
          placeholder="Search products to adjust their stock…"
          className="max-w-sm"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <Table
        columns={stockColumns(onAdjust)}
        rows={data?.items ?? []}
        rowKey={(p) => p._id}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        emptyTitle={q ? 'No products match that search' : 'No products yet'}
      />
      <Pagination page={page} pages={data?.meta.pages ?? 1} onPageChange={setPage} />
    </Card>
  );
}

function ActivityView() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useRecentInventoryLog(page);
  return (
    <Card>
      <InventoryLogTable
        entries={data?.items ?? []}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        showProduct
      />
      <Pagination page={page} pages={data?.meta.pages ?? 1} onPageChange={setPage} />
    </Card>
  );
}

export default function Inventory() {
  const [view, setView] = useState<View>('low');
  const [selected, setSelected] = useState<Product | null>(null);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
        <Segmented
          label="Inventory view"
          value={view}
          onChange={setView}
          options={[
            { value: 'low', label: 'Low stock' },
            { value: 'all', label: 'All products' },
            { value: 'log', label: 'Activity' },
          ]}
        />
      </div>

      {view === 'low' && <LowStockView onAdjust={setSelected} />}
      {view === 'all' && <AllProductsView onAdjust={setSelected} />}
      {view === 'log' && <ActivityView />}

      <AdjustStockModal product={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
