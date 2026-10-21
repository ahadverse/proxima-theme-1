import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';

/** An indeterminate top-of-page loading bar driven by TanStack Query's global
 * in-flight counters — lights up for ANY query or mutation, anywhere, with no
 * per-page wiring. */
export function GlobalLoadingBar() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const active = isFetching > 0 || isMutating > 0;

  return (
    <div className="relative h-0.5 w-full shrink-0 overflow-hidden bg-slate-100">
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            <motion.div
              className="absolute inset-y-0 w-1/3 rounded-full bg-brand-accent"
              animate={{ left: ['-35%', '100%'] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
