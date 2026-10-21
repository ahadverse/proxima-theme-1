'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { trackAddToCart } from '@/lib/track';

export interface CartLine {
  productId: string;
  slug: string;
  title: string;
  image?: string;
  price: number;
  variantSku?: string | null;
  variantLabel?: string | null;
  quantity: number;
  maxStock?: number;
}

interface CartState {
  lines: CartLine[];
  isOpen: boolean;
  addItem: (line: Omit<CartLine, 'quantity'>, quantity?: number) => void;
  removeItem: (productId: string, variantSku?: string | null) => void;
  updateQuantity: (productId: string, variantSku: string | null | undefined, quantity: number) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
}

const lineKey = (productId: string, variantSku?: string | null) => `${productId}::${variantSku ?? ''}`;

// An order line takes at most 99 of a product (the checkout API rejects more).
const MAX_PER_LINE = 99;

/** A quantity held to what's in stock (when known) and to what an order line can carry — never below 1. */
const clampQuantity = (quantity: number, maxStock?: number) =>
  Math.max(1, Math.min(quantity, maxStock ?? MAX_PER_LINE, MAX_PER_LINE));

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      isOpen: false,

      addItem: (line, quantity = 1) => {
        const key = lineKey(line.productId, line.variantSku);
        const existing = get().lines.find((l) => lineKey(l.productId, l.variantSku) === key);

        if (existing) {
          set({
            lines: get().lines.map((l) => {
              if (lineKey(l.productId, l.variantSku) !== key) return l;
              // The freshest stock figure (from the page the item was just added on) replaces the one saved earlier.
              const maxStock = line.maxStock ?? l.maxStock;
              return { ...l, maxStock, quantity: clampQuantity(l.quantity + quantity, maxStock) };
            }),
          });
        } else {
          set({ lines: [...get().lines, { ...line, quantity: clampQuantity(quantity, line.maxStock) }] });
        }
        set({ isOpen: true });

        // Every way of adding to the cart (card, product page, quick view, buy now) comes through here.
        trackAddToCart(line.productId, quantity, line.variantSku);
      },

      removeItem: (productId, variantSku) => {
        const key = lineKey(productId, variantSku);
        set({ lines: get().lines.filter((l) => lineKey(l.productId, l.variantSku) !== key) });
      },

      updateQuantity: (productId, variantSku, quantity) => {
        const key = lineKey(productId, variantSku);
        if (quantity <= 0) {
          set({ lines: get().lines.filter((l) => lineKey(l.productId, l.variantSku) !== key) });
          return;
        }
        set({
          lines: get().lines.map((l) =>
            lineKey(l.productId, l.variantSku) === key
              ? { ...l, quantity: clampQuantity(quantity, l.maxStock) }
              : l
          ),
        });
      },

      clear: () => set({ lines: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
    }),
    {
      name: 'maroon-cart',
      // Only the lines belong in storage. The drawer's open/closed state used to be saved too, so a
      // cart left open reopened itself over the next page load — and over checkout's Place Order button.
      partialize: (state) => ({ lines: state.lines }),
      merge: (persisted, current) => ({
        ...current,
        lines: (persisted as { lines?: CartLine[] } | undefined)?.lines ?? [],
      }),
    }
  )
);

export const useCartCount = () =>
  useCartStore((s) => s.lines.reduce((sum, l) => sum + l.quantity, 0));

export const useCartSubtotal = () =>
  useCartStore((s) => s.lines.reduce((sum, l) => sum + l.price * l.quantity, 0));
