import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

/** Settings and Staff are super-admin only on the API; this keeps staff from landing on a page that can only 403. */
export function SuperAdminRoute() {
  const role = useAuthStore((s) => s.admin?.role);
  if (role !== 'super-admin') return <Navigate to="/" replace />;
  return <Outlet />;
}
