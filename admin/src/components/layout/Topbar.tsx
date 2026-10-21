import { Menu, RefreshCw } from 'lucide-react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '@/store/uiStore';
import { cn } from '@/lib/cn';
import { UserMenu } from './UserMenu';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';

export function Topbar() {
  const openSidebar = useUiStore((s) => s.openSidebar);
  const queryClient = useQueryClient();
  const isFetching = useIsFetching();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-slate-100 px-4 sm:px-6">
      <button
        type="button"
        onClick={openSidebar}
        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-200 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => void queryClient.invalidateQueries()}
          title="Refresh data"
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-200"
        >
          <RefreshCw className={cn('h-4 w-4', isFetching > 0 && 'animate-spin')} />
        </button>
        <ThemeToggle />
        <NotificationBell />
        <div className="mx-1.5 h-6 w-px bg-slate-200" />
        <UserMenu />
      </div>
    </header>
  );
}
