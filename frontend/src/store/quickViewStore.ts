'use client';

import { create } from 'zustand';
import type { ProductCard } from '@/types/catalog';

interface QuickViewState {
  product: ProductCard | null;
  open: (product: ProductCard) => void;
  close: () => void;
}

export const useQuickViewStore = create<QuickViewState>((set) => ({
  product: null,
  open: (product) => set({ product }),
  close: () => set({ product: null }),
}));
