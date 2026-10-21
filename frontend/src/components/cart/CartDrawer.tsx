'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { AnimatePresence, m } from 'framer-motion';
import { MotionProvider } from '@/components/ui/Motion';
import { X, ShoppingBag, Trash2 } from 'lucide-react';
import { ProductThumb } from '@/components/product/ProductThumb';
import { Stepper } from '@/components/ui/Stepper';
import { ButtonLink } from '@/components/ui/Button';
import { useDialog } from '@/hooks/useDialog';
import { formatBDT } from '@/lib/currency';
import { useCartStore, useCartSubtotal } from '@/store/cartStore';

function CartPanel() {
  const lines = useCartStore((s) => s.lines);
  const closeCart = useCartStore((s) => s.closeCart);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const subtotal = useCartSubtotal();

  const panelRef = useRef<HTMLDivElement>(null);
  useDialog(panelRef, closeCart);

  return (
    <m.div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
      tabIndex={-1}
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl focus:outline-none"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 id="cart-drawer-title" className="text-lg font-bold text-slate-900">
          Shopping Cart ({lines.length})
        </h2>
        <button
          type="button"
          onClick={closeCart}
          aria-label="Close cart"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {lines.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center">
          <ShoppingBag className="h-12 w-12 text-slate-300" aria-hidden />
          <p className="text-sm text-slate-600">Your cart is empty.</p>
          <ButtonLink href="/products" onClick={closeCart}>
            Start Shopping
          </ButtonLink>
        </div>
      ) : (
        <>
          <ul className="flex-1 overflow-y-auto px-5">
            {lines.map((line) => (
              <li
                key={`${line.productId}-${line.variantSku ?? ''}`}
                className="flex gap-3 border-b border-slate-100 py-4 last:border-0"
              >
                <ProductThumb src={line.image} title={line.title} decorative className="h-16 w-16 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/product/${line.slug}`}
                      onClick={closeCart}
                      className="line-clamp-2 text-sm font-medium text-slate-800 hover:text-brand-primary"
                    >
                      {line.title}
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeItem(line.productId, line.variantSku)}
                      aria-label={`Remove ${line.title} from cart`}
                      className="shrink-0 text-slate-500 transition-colors hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  {line.variantLabel && <p className="mt-0.5 text-xs text-slate-500">{line.variantLabel}</p>}
                  <div className="mt-2 flex items-center justify-between">
                    <Stepper
                      value={line.quantity}
                      label={line.title}
                      onChange={(q) => updateQuantity(line.productId, line.variantSku, q)}
                      max={Math.min(line.maxStock ?? 99, 99)}
                      className="origin-left scale-90"
                    />
                    <p className="text-sm font-bold text-brand-primary">{formatBDT(line.price * line.quantity)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-slate-100 px-5 py-4">
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="text-slate-600">Subtotal</span>
              <span className="text-lg font-bold text-slate-900">{formatBDT(subtotal)}</span>
            </div>
            <div className="flex flex-col gap-2">
              <ButtonLink href="/checkout" onClick={closeCart} size="lg" className="w-full">
                Checkout
              </ButtonLink>
              <Link
                href="/cart"
                onClick={closeCart}
                className="flex h-12 w-full items-center justify-center rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                View Full Cart
              </Link>
            </div>
          </div>
        </>
      )}
    </m.div>
  );
}

export function CartDrawer() {
  const isOpen = useCartStore((s) => s.isOpen);
  const closeCart = useCartStore((s) => s.closeCart);

  return (
    <MotionProvider>
      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60"
            onClick={closeCart}
          >
            <CartPanel />
          </m.div>
        )}
      </AnimatePresence>
    </MotionProvider>
  );
}
