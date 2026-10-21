import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Bell, PackageX, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useNotifications } from '@/api/notifications';
import type { NotificationItem, NotificationType } from '@/types/notification';

const LAST_SEEN_KEY = 'maroon-admin-notifications-last-seen';

function getLastSeen(): number {
  try {
    return Number(localStorage.getItem(LAST_SEEN_KEY) ?? 0);
  } catch {
    return 0;
  }
}

const typeIcon: Record<NotificationType, typeof Bell> = {
  low_stock: PackageX,
  fraud_risk: AlertTriangle,
  new_order: ShoppingBag,
};
const typeTone: Record<NotificationType, string> = {
  low_stock: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  fraud_risk: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  new_order: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
};

export function NotificationBell() {
  const { data: items } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState(getLastSeen);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const unreadCount = (items ?? []).filter((n: NotificationItem) => new Date(n.createdAt).getTime() > lastSeen).length;

  function handleToggle() {
    setIsOpen((v) => !v);
    const now = Date.now();
    try {
      localStorage.setItem(LAST_SEEN_KEY, String(now));
    } catch {
      // Private browsing / blocked storage — the unread badge just won't persist across reloads.
    }
    setLastSeen(now);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        title="Notifications"
        className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-200"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-slate-300 bg-slate-100 p-1.5 shadow-lg"
          >
            <p className="px-3 py-2 text-sm font-semibold text-slate-800">Notifications</p>
            <div className="scrollbar-thin max-h-80 overflow-y-auto">
              {(items ?? []).length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-slate-400">You&rsquo;re all caught up.</p>
              )}
              {items?.map((item) => {
                const Icon = typeIcon[item.type];
                return (
                  <Link
                    key={item.id}
                    to={item.link}
                    onClick={() => setIsOpen(false)}
                    className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-slate-200"
                  >
                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', typeTone[item.type])}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-slate-700">{item.message}</span>
                      <span className="block text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
