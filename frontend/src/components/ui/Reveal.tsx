'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { inView } from 'framer-motion';
import { animate } from 'framer-motion/dom/mini';

/**
 * Fades and slides its content up the first time it scrolls into view.
 *
 * The content is in the server's HTML and fully visible until the page has loaded; only a block that
 * is still below the fold at that point is tucked away (invisibly — it's off screen) and revealed when it
 * arrives. So nothing above the fold is ever delayed or starts at opacity 0 (no hit to LCP), nothing
 * is lost without JavaScript, and only opacity/transform change, so there's no layout shift. Visitors who
 * prefer reduced motion never see it hidden at all.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  distance = 28,
}: {
  children: ReactNode;
  className?: string;
  /** Seconds to wait once it's in view. */
  delay?: number;
  /** How far (px) it rises into place. */
  distance?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Already on screen — above the fold, or the browser restored the scroll position: leave it alone.
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    el.style.opacity = '0';
    el.style.transform = `translateY(${distance}px)`;
    const reset = () => {
      el.style.removeProperty('opacity');
      el.style.removeProperty('transform');
    };

    const stop = inView(
      el,
      () => {
        stop();
        animate(el, { opacity: 1, transform: 'translateY(0px)' }, { duration: 0.6, delay, ease: 'easeOut' }).then(reset);
      },
      { margin: '0px 0px -10% 0px' }
    );

    return () => {
      stop();
      reset();
    };
  }, [delay, distance]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
