import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { SplashScreen } from '@/components/layout/SplashScreen';
import { useAuthStore } from '@/store/authStore';

export function ProtectedRoute() {
  const status = useAuthStore((s) => s.status);
  const isVerified = useAuthStore((s) => s.isVerified);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  // Confirm the session once per page load. For a returning admin the app is already on screen
  // (see authStore), so this runs in the background alongside the page's own data requests.
  useEffect(() => {
    if (!isVerified) void fetchMe();
  }, [isVerified, fetchMe]);

  if (status === 'idle' || status === 'loading') return <SplashScreen />;
  if (status === 'unauthenticated') return <Navigate to="/login" replace />;
  return <Outlet />;
}
