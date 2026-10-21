'use client';

import { useEffect } from 'react';
import { recallPurchaseItems, trackPurchase } from '@/lib/pixel';

export function PurchasePixelEvent({ orderNumber, value }: { orderNumber: string; value: number }) {
  useEffect(() => {
    const key = `purchase-fired-${orderNumber}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // sessionStorage unavailable (private mode etc.) — fire anyway, worst case is a duplicate.
    }
    trackPurchase({ orderNumber, value, items: recallPurchaseItems(orderNumber) });
  }, [orderNumber, value]);

  return null;
}
