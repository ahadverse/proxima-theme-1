'use client';

import { ShoppingBag } from 'lucide-react';
import { CartLineItem } from '@/components/cart/CartLineItem';
import { ButtonLink } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useHydrated } from '@/hooks/useHydrated';
import { formatBDT } from '@/lib/currency';
import { useCartStore, useCartSubtotal } from '@/store/cartStore';

export default function CartPage() {
  const hydrated = useHydrated();
  const lines = useCartStore((s) => s.lines);
  const subtotal = useCartSubtotal();

  // The cart lives in the browser, so until the page is live there's no telling whether it's empty.
  if (!hydrated) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-8" aria-busy="true">
        <h1 className="mb-6 text-2xl font-bold text-white">Shopping Cart</h1>
        <div className="flex flex-col gap-8 lg:flex-row">
          <Skeleton className="h-48 flex-1 rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl lg:w-80" />
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <ShoppingBag className="h-16 w-16 text-white/20" aria-hidden />
        <h1 className="text-xl font-bold text-white">Your cart is empty</h1>
        <p className="text-sm text-brand-text-muted">Browse our catalog and add products you love.</p>
        <ButtonLink href="/products">Start Shopping</ButtonLink>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
      <h1 className="mb-6 text-2xl font-bold text-white">Shopping Cart</h1>

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex-1 rounded-xl border border-slate-100 bg-white p-5">
          {lines.map((line) => (
            <CartLineItem key={`${line.productId}-${line.variantSku ?? ''}`} line={line} />
          ))}
        </div>

        <div className="w-full shrink-0 self-start rounded-xl border border-slate-100 bg-white p-5 lg:w-80">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Order Summary</h2>
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="text-slate-600">Subtotal</span>
            <span className="font-semibold text-slate-900">{formatBDT(subtotal)}</span>
          </div>
          <p className="mb-4 text-xs text-slate-500">Delivery charge is calculated at checkout.</p>
          <ButtonLink href="/checkout" size="lg" className="w-full">
            Proceed to Checkout
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
