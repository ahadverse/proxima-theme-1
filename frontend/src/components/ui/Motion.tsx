'use client';

import type { ReactNode } from 'react';
import { LazyMotion, MotionConfig } from 'framer-motion';

const loadFeatures = () => import('./motion-features').then((mod) => mod.default);

/**
 * Turns on Framer Motion for everything inside it. Only the small `m` components are in the page's own
 * bundle; the animation engine downloads afterwards (an animation waits for it, the content never does).
 * `reducedMotion="user"` honours the visitor's OS setting: transform and layout animations are skipped,
 * and only opacity fades remain.
 *
 * Use `m.*` (never `motion.*`) inside — `strict` throws on the full-size component, which would pull the
 * whole library back into the first load.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
