'use client';

import { useState, type FormEvent } from 'react';
import { Trash2, X } from 'lucide-react';
import { ProductThumb } from '@/components/product/ProductThumb';
import { Stepper } from '@/components/ui/Stepper';
import type { AppliedCoupon } from '@/lib/coupon';
import { formatBDT } from '@/lib/currency';
import { useCartStore } from '@/store/cartStore';

export function OrderSummary({
  deliveryCharge,
  coupon,
  onApplyCoupon,
  onRemoveCoupon,
}: {
  deliveryCharge: number;
  /** The coupon currently applied to this order, if any. */
  coupon: AppliedCoupon | null;
  /** Resolves with an error message to show, or null when the coupon was accepted. */
  onApplyCoupon: (code: string) => Promise<string | null>;
  onRemoveCoupon: () => void;
}) {
  const lines = useCartStore((s) => s.lines);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const [code, setCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const discount = coupon?.discount ?? 0;
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const grandTotal = subtotal - discount + deliveryCharge;

  async function handleApply(e: FormEvent) {
    // This sits inside the checkout <form> (the summary is a sibling of its fields), so the apply
    // button must not submit the order.
    e.preventDefault();
    if (!code.trim()) return;

    setIsApplying(true);
    setCouponError(null);
    const error = await onApplyCoupon(code.trim());
    setIsApplying(false);

    if (error) setCouponError(error);
    else setCode('');
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <h2 className="text-lg font-bold text-slate-900">Order Information</h2>
      </div>

      <div className="m-3 hidden items-center justify-between rounded-md bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-900 sm:flex">
        <span>Product</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-10">
            <span>Quantity</span>
            <span className="w-16 text-right">Price</span>
          </span>
          {/* Same width as each row's remove button, so Price stays above the prices. */}
          <span aria-hidden className="w-7" />
        </span>
      </div>

      <div className="divide-y divide-slate-100 px-5">
        {lines.map((line) => (
          <div key={`${line.productId}-${line.variantSku ?? ''}`} className="relative flex items-center gap-3 py-3">
            <ProductThumb src={line.image} title={line.title} className="h-14 w-14 shrink-0 rounded-md border border-slate-100" decorative />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-medium text-slate-800">{line.title}</p>
              {line.variantLabel && <p className="text-xs text-slate-500">{line.variantLabel}</p>}
            </div>
            <Stepper
              value={line.quantity}
              onChange={(q) => updateQuantity(line.productId, line.variantSku, q)}
              className="scale-90"
            />
            <p className="w-16 shrink-0 text-right text-sm font-semibold text-slate-900">
              {formatBDT(line.price * line.quantity)}
            </p>
            {/* type="button": this summary sits inside the checkout <form>, so it must not submit the order.
                On a narrow screen it floats in the row's top corner rather than squeezing the product name. */}
            <button
              type="button"
              onClick={() => removeItem(line.productId, line.variantSku)}
              aria-label={`Remove ${line.title} from order`}
              className="absolute top-1 right-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 sm:static sm:shrink-0"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>

      <div className="px-5 py-2 text-sm [&>div]:py-2.5">
        <div className="flex justify-between">
          <span className="text-slate-500">Subtotal</span>
          <span className="font-medium text-slate-800">{formatBDT(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">
            Discount
            {coupon && <span className="ml-1.5 rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">{coupon.code}</span>}
          </span>
          <span className={coupon ? 'font-medium text-emerald-700' : 'font-medium text-slate-800'}>
            {coupon ? `−${formatBDT(discount)}` : formatBDT(0)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Delivery Charge</span>
          <span className="font-medium text-slate-800">{formatBDT(deliveryCharge)}</span>
        </div>
        <div className="flex justify-between border-t border-slate-200 text-base font-bold text-slate-900">
          <span>Grand Total</span>
          <span className="text-brand-primary">{formatBDT(grandTotal)}</span>
        </div>
      </div>

      <div className="border-t border-slate-200 p-3">
        {coupon ? (
          <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <span>
              Coupon <strong>{coupon.code}</strong> applied
            </span>
            <button
              type="button"
              onClick={onRemoveCoupon}
              aria-label="Remove coupon"
              className="rounded p-1 text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="brand-gradient flex gap-2 rounded-xl p-3">
              <input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setCouponError(null);
                }}
                onKeyDown={(e) => {
                  // Enter in this box applies the coupon; it must not place the order.
                  if (e.key === 'Enter') void handleApply(e);
                }}
                aria-label="Coupon code"
                aria-invalid={Boolean(couponError)}
                placeholder="Apply Coupon"
                autoComplete="off"
                className="w-full rounded-lg border border-transparent bg-white px-3 py-2.5 text-sm text-black uppercase placeholder:normal-case placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-accent"
              />
              <button
                type="button"
                onClick={handleApply}
                disabled={isApplying || !code.trim()}
                className="shrink-0 rounded-lg border-2 border-white px-4 text-sm font-bold text-white transition-colors hover:bg-white/15 disabled:opacity-60"
              >
                {isApplying ? '…' : 'APPLY'}
              </button>
            </div>
            {couponError && (
              <p role="alert" className="mt-2 px-1 text-xs font-medium text-red-600">
                {couponError}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
