import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { GlobalLoadingBar } from './GlobalLoadingBar';
import { DemoBanner } from './DemoBanner';
import { Skeleton } from '@/components/ui/Skeleton';

export function AdminLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
      <DemoBanner />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <GlobalLoadingBar />
          <main className="flex-1 overflow-y-auto p-6">
            {/* Pages are downloaded when first opened; the sidebar and top bar stay put while one arrives. */}
            <Suspense
              fallback={
                <div role="status" aria-busy="true" className="space-y-4">
                  <span className="sr-only">Loading…</span>
                  <Skeleton className="h-8 w-56" />
                  <Skeleton className="h-64 w-full" />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}
