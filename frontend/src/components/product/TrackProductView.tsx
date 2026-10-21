'use client';

import { useEffect } from 'react';
import { trackProductView } from '@/lib/track';

/** Reports that this product page was opened. Renders nothing. (The backend ignores repeat views by the same visitor within half an hour.) */
export function TrackProductView({ productId }: { productId: string }) {
  useEffect(() => {
    trackProductView(productId);
  }, [productId]);

  return null;
}
