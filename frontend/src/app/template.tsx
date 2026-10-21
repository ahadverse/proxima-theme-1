'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { MotionProvider } from '@/components/ui/Motion';

// Flips once the first page has hydrated; every template mounted after that is a client-side navigation.
let hasHydrated = false;

/**
 * Wraps each route's content and re-mounts on every navigation: that is what gives page changes their
 * gentle fade-in (a CSS animation — see `route-in` in globals.css — so it can never leave a page stuck
 * invisible). The first, server-rendered page is not faded: it must paint as soon as it arrives.
 * It also turns on Framer Motion for the page content below (the header, the cart drawer and the quick-view
 * dialog sit outside a template and carry their own provider).
 */
export default function Template({ children }: { children: ReactNode }) {
  const [navigated] = useState(() => hasHydrated);

  useEffect(() => {
    hasHydrated = true;
  }, []);

  return (
    <MotionProvider>
      <div className={navigated ? 'animate-route-in' : undefined}>{children}</div>
    </MotionProvider>
  );
}
