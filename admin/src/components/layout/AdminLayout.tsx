import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { GlobalLoadingBar } from './GlobalLoadingBar';
import { DemoBanner } from './DemoBanner';

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
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
