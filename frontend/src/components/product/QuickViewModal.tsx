'use client';

import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, m } from 'framer-motion';
import { MotionProvider } from '@/components/ui/Motion';
import { toast } from 'sonner';
import { useQuickViewStore } from '@/store/quickViewStore';
import { useCartStore } from '@/store/cartStore';
import { ProductThumb } from './ProductThumb';
import { Price } from '@/components/ui/Price';
import { Stepper } from '@/components/ui/Stepper';
import { Button } from '@/components/ui/Button';
import { useDialog } from '@/hooks/useDialog';
import { cn } from '@/lib/cn';
import { trackCartAddition } from '@/lib/pixel';
import { groupVariantAttributes, selectionOf, variantForChoice } from '@/lib/variants';
import type { ProductCard } from '@/types/catalog';

function QuickViewPanel({ product }: { product: ProductCard }) {
  const close = useQuickViewStore((s) => s.close);
  const addItem = useCartStore((s) => s.addItem);
  // The panel is remounted for each product (see QuickViewModal), so these start fresh every time.
  const [quantity, setQuantity] = useState(1);
  const [selectedSku, setSelectedSku] = useState<string | null>(product.variants[0]?.sku ?? null);

  const panelRef = useRef<HTMLDivElement>(null);
  useDialog(panelRef, close);

  const variant = product.variants.find((v) => v.sku === selectedSku);
  const isVariable = product.productType === 'variable';
  const price = variant?.price ?? product.basePrice;
  const compareAtPrice = variant?.compareAtPrice ?? product.compareAtPrice;
  // A variable product's stock is its chosen variant's; a simple one only says in/out of stock.
  const isOutOfStock = isVariable ? !variant || variant.stock <= 0 : product.stockStatus === 'out_of_stock';
  const maxStock = variant?.stock;
  const selectedQuantity = Math.min(quantity, Math.max(maxStock ?? 99, 1), 99);

  const attributeGroups = groupVariantAttributes(product.variants);
  const selection = selectionOf(variant);

  function handleAddToCart() {
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        title: product.title,
        image: variant?.images?.[0]?.url ?? product.images[0]?.url,
        price,
        variantSku: variant?.sku,
        variantLabel: variant?.attributes.map((a) => a.value).join(' / '),
        maxStock,
      },
      selectedQuantity
    );
    trackCartAddition({
      id: product.id,
      name: product.title,
      price,
      quantity: selectedQuantity,
      variant: variant?.attributes.map((a) => a.value).join(' / '),
    });
    toast.success(`${product.title} added to cart`);
    close();
  }

  return (
    <m.div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-view-title"
      tabIndex={-1}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => e.stopPropagation()}
      className="relative max-h-full w-full max-w-lg overflow-y-auto rounded-2xl border-t-4 border-brand-primary bg-white p-6 shadow-2xl focus:outline-none"
    >
      <button
        type="button"
        onClick={close}
        aria-label="Close quick view"
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>

      <div className="flex gap-5 border-b border-slate-200 pb-5 pr-10">
        <ProductThumb
          src={variant?.images?.[0]?.url ?? product.images[0]?.url}
          title={product.title}
          decorative
          className="h-28 w-28 shrink-0 rounded-lg border border-slate-100 shadow-md"
        />
        <div className="min-w-0">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-brand-primary">
            {isVariable ? 'Choose your options' : 'Quick view'}
          </p>
          <h2 id="quick-view-title" className="mb-2 text-xl font-semibold leading-snug text-slate-900">
            {product.title}
          </h2>
          <Price price={price} compareAtPrice={compareAtPrice} size="lg" />
        </div>
      </div>

      {attributeGroups.map(([attrName, values]) => (
        <div key={attrName} role="group" aria-label={attrName} className="mt-5">
          <p aria-hidden className="mb-2 text-sm font-semibold text-slate-700">
            {attrName}
          </p>
          <div className="flex flex-wrap gap-2">
            {values.map((value) => {
              const isActive = selection[attrName] === value;
              const target = variantForChoice(product.variants, selection, attrName, value);
              const soldOut = Boolean(target && target.stock <= 0);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => target && setSelectedSku(target.sku)}
                  className={cn(
                    'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-brand-primary bg-brand-primary text-white'
                      : 'border-slate-300 text-slate-700 hover:border-brand-primary',
                    soldOut && !isActive && 'text-slate-500 line-through'
                  )}
                >
                  {value}
                  {soldOut && <span className="sr-only"> (out of stock)</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mt-5">
        <p className="mb-2 text-sm font-semibold text-slate-700">
          Choose Quantity
        </p>
        <Stepper value={selectedQuantity} onChange={setQuantity} max={Math.min(maxStock ?? 99, 99)} label={product.title} />
      </div>

      <Button onClick={handleAddToCart} disabled={isOutOfStock} className="mt-6 w-full uppercase" size="lg">
        {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
      </Button>
    </m.div>
  );
}

export function QuickViewModal() {
  const product = useQuickViewStore((s) => s.product);
  const close = useQuickViewStore((s) => s.close);

  return (
    <MotionProvider>
      <AnimatePresence>
        {product && (
          <m.div
            key={product.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={close}
          >
            <QuickViewPanel product={product} />
          </m.div>
        )}
      </AnimatePresence>
    </MotionProvider>
  );
}
