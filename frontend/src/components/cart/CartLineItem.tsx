'use client';

import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { ProductThumb } from '@/components/product/ProductThumb';
import { Stepper } from '@/components/ui/Stepper';
import { formatBDT } from '@/lib/currency';
import { useCartStore, type CartLine } from '@/store/cartStore';

export function CartLineItem({ line }: { line: CartLine }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-slate-100 py-4 last:border-0 sm:flex-nowrap">
      <ProductThumb src={line.image} title={line.title} decorative className="h-16 w-16 shrink-0 rounded-lg" />

      <div className="min-w-0 flex-1 basis-40">
        <Link href={`/product/${line.slug}`} className="line-clamp-2 text-sm font-medium text-slate-800 hover:text-brand-primary">
          {line.title}
        </Link>
        {line.variantLabel && <p className="mt-0.5 text-xs text-slate-500">{line.variantLabel}</p>}
        <p className="mt-1 text-sm font-bold text-brand-primary">{formatBDT(line.price)}</p>
      </div>

      <Stepper
        value={line.quantity}
        label={line.title}
        onChange={(q) => updateQuantity(line.productId, line.variantSku, q)}
        max={Math.min(line.maxStock ?? 99, 99)}
      />

      <p className="w-20 shrink-0 text-right text-sm font-bold text-slate-900">
        {formatBDT(line.price * line.quantity)}
      </p>

      <button
        type="button"
        onClick={() => removeItem(line.productId, line.variantSku)}
        aria-label={`Remove ${line.title} from cart`}
        className="shrink-0 text-slate-500 transition-colors hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
