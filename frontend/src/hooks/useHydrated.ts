'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False while rendering on the server and during hydration, true once the page is live in the browser.
 * Things that only exist in the browser (the saved cart, the wishlist) can't be known before that, so
 * showing "your cart is empty" until then would flash the wrong answer at every shopper with a cart.
 */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
