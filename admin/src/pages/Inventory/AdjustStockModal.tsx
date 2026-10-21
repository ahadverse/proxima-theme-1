import { useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';
import { Badge } from '@/components/ui/Badge';
import { apiErrorMessage } from '@/lib/api';
import { useInventoryLog } from '@/api/inventory';
import { useAdjustStock } from '@/api/products';
import { InventoryLogTable } from './InventoryLogTable';
import { variantLabel } from './stock';
import type { Product } from '@/types/product';

const stockTone: Record<Product['stockStatus'], 'green' | 'amber' | 'red'> = {
  in_stock: 'green',
  low_stock: 'amber',
  out_of_stock: 'red',
};

export function AdjustStockModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  return (
    <Modal
      isOpen={Boolean(product)}
      onClose={onClose}
      title={product ? `Stock — ${product.title}` : ''}
      widthClassName="max-w-3xl"
    >
      {/* Keyed so each product starts with an empty form instead of the last one's half-typed values. */}
      {product && <AdjustStockBody key={product._id} product={product} />}
    </Modal>
  );
}

function AdjustStockBody({ product }: { product: Product }) {
  const isVariable = product.productType === 'variable';
  const [variantSku, setVariantSku] = useState(isVariable ? (product.variants[0]?.sku ?? '') : '');
  const [quantityChange, setQuantityChange] = useState('');
  const [note, setNote] = useState('');
  const adjustMutation = useAdjustStock();
  const { data, isLoading, isError, refetch } = useInventoryLog(product._id, 1);

  const parsedQuantity = Number(quantityChange);
  const canSubmit =
    quantityChange !== '' &&
    Number.isInteger(parsedQuantity) &&
    parsedQuantity !== 0 &&
    (!isVariable || variantSku !== '');

  // `product` is a snapshot from when the row was clicked, so after an adjustment it goes stale —
  // the newest log entry for the same stock (the log refetches on every change) is the live number.
  const selectedVariant = product.variants.find((v) => v.sku === variantSku);
  const latest = data?.items.find((e) => (isVariable ? e.variantSku === variantSku : e.variantSku === null));
  const liveStock = latest?.resultingStock ?? (isVariable ? selectedVariant?.stock : product.stock);

  function handleAdjust() {
    if (!canSubmit) return;
    const action = adjustMutation.mutateAsync({
      id: product._id,
      quantityChange: parsedQuantity,
      variantSku: isVariable ? variantSku : undefined,
      note: note.trim() || undefined,
    });
    toast.promise(action, {
      loading: 'Adjusting stock…',
      success: () => {
        setQuantityChange('');
        setNote('');
        return 'Stock adjusted';
      },
      error: (err) => apiErrorMessage(err, 'Could not adjust stock'),
    });
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        {product.images[0] && <img src={product.images[0].url} alt="" className="h-12 w-12 rounded-lg object-cover" />}
        <div>
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            {isVariable ? 'Selected variant stock' : 'Current stock'}
          </p>
          <p className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            {liveStock ?? '—'}
            {!isVariable && <Badge tone={stockTone[product.stockStatus]}>{product.stockStatus.replace(/_/g, ' ')}</Badge>}
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAdjust();
        }}
        className="mb-5 rounded-lg bg-slate-200/60 p-4"
      >
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_130px_1fr_auto]">
          {isVariable ? (
            <FormField label="Variant">
              <Select value={variantSku} onChange={(e) => setVariantSku(e.target.value)}>
                {product.variants.map((v) => (
                  <option key={v.sku} value={v.sku}>
                    {variantLabel(v)}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : (
            <div className="hidden sm:block" />
          )}
          <FormField label="Quantity change">
            <Input
              type="number"
              step={1}
              value={quantityChange}
              onChange={(e) => setQuantityChange(e.target.value)}
              placeholder="e.g. 10 or -5"
            />
          </FormField>
          <FormField label="Note">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Supplier restock" />
          </FormField>
          <Button type="submit" isLoading={adjustMutation.isPending} disabled={!canSubmit}>
            Apply
          </Button>
        </div>
        <p className="mt-2.5 text-xs text-slate-500">
          Positive numbers add stock (restock); negative numbers deduct it, down to zero at most.
        </p>
      </form>

      <InventoryLogTable
        entries={data?.items ?? []}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
      />
    </>
  );
}
