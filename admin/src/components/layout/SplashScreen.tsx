import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

/** Shown only while a visitor with no remembered session is being checked — a returning admin
 * is shown the app immediately and never sees it. */
export function SplashScreen() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-5 bg-slate-50">
      <div className="brand-gradient flex h-12 w-12 items-center justify-center rounded-xl text-brand-on-primary shadow-lg ring-1 ring-inset ring-white/10">
        <Zap className="h-6 w-6" />
      </div>
      <div className="relative h-1 w-32 overflow-hidden rounded-full bg-slate-200">
        <motion.div
          className="absolute inset-y-0 w-1/3 rounded-full bg-brand-ink"
          animate={{ left: ['-35%', '100%'] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}
