import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/cn';

export function UserMenu() {
  const { admin, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const initials = (admin?.name ?? 'A')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm transition-colors hover:bg-slate-200"
      >
        <span className="brand-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-brand-on-primary">
          {initials}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium leading-none text-slate-800">
            {admin?.name ?? 'Admin'}
          </span>
          <span className="block text-xs capitalize leading-none text-slate-400">
            {admin?.role?.replace('-', ' ')}
          </span>
        </span>
        <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', isOpen && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-slate-300 bg-slate-100 p-1.5 shadow-lg"
          >
            <div className="border-b border-slate-200 px-3 py-2">
              <p className="truncate text-sm font-medium text-slate-800">{admin?.name}</p>
              <p className="truncate text-xs text-slate-400">{admin?.email}</p>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-slate-200 hover:text-red-600 dark:hover:text-red-400"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
