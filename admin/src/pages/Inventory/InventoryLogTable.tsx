import { Badge } from '@/components/ui/Badge';
import { Table, type Column } from '@/components/ui/Table';
import { cn } from '@/lib/cn';
import type { InventoryLogEntry } from '@/types/inventory';

const changeTone: Record<InventoryLogEntry['changeType'], 'green' | 'amber' | 'red' | 'slate'> = {
  restock: 'green',
  sale: 'slate',
  return: 'amber',
  adjustment: 'red',
};

interface InventoryLogTableProps {
  entries: InventoryLogEntry[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  /** Store-wide activity names the product on every row; one product's own log doesn't need to. */
  showProduct?: boolean;
}

/** Stock movements, newest first: what changed, by how much, and what was left afterwards. */
export function InventoryLogTable({ entries, isLoading, isError, onRetry, showProduct = false }: InventoryLogTableProps) {
  const columns: Column<InventoryLogEntry>[] = [
    { header: 'Date', key: 'createdAt', render: (e) => new Date(e.createdAt).toLocaleString() },
    ...(showProduct
      ? [
          {
            header: 'Product',
            key: 'product',
            render: (e: InventoryLogEntry) => (
              <span className="font-medium text-slate-800">{e.product?.title ?? 'Deleted product'}</span>
            ),
          },
        ]
      : []),
    {
      header: 'Variant',
      key: 'variantSku',
      render: (e) => e.variantSku ?? '—',
    },
    {
      header: 'Type',
      key: 'changeType',
      render: (e) => <Badge tone={changeTone[e.changeType]}>{e.changeType}</Badge>,
    },
    {
      header: 'Change',
      key: 'quantityChange',
      render: (e) => (
        <span
          className={cn(
            'font-semibold tabular-nums',
            e.quantityChange < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
          )}
        >
          {e.quantityChange > 0 ? '+' : ''}
          {e.quantityChange}
        </span>
      ),
    },
    { header: 'Resulting stock', key: 'resultingStock' },
    { header: 'Note', key: 'note', render: (e) => e.note ?? '—' },
    { header: 'By', key: 'changedBy', render: (e) => e.changedBy?.name ?? 'System' },
  ];

  return (
    <Table
      columns={columns}
      rows={entries}
      rowKey={(e) => e._id}
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
      emptyTitle="No stock changes logged yet"
    />
  );
}
