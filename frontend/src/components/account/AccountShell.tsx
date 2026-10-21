'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Package, User, Heart, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/cn';

const navItems = [
  { label: 'Dashboard', href: '/account', icon: LayoutDashboard },
  { label: 'Orders', href: '/account/orders', icon: Package },
  { label: 'Wishlist', href: '/account/wishlist', icon: Heart },
  { label: 'Profile', href: '/account/profile', icon: User },
];

const LOADING_FALLBACK = (
  <div role="status" className="flex min-h-[50vh] items-center justify-center">
    <div aria-hidden className="h-8 w-8 animate-spin rounded-full border-4 border-brand-accent border-t-transparent" />
    <span className="sr-only">Loading your account…</span>
  </div>
);

export function AccountShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={LOADING_FALLBACK}>
      <AccountLayoutInner>{children}</AccountLayoutInner>
    </Suspense>
  );
}

function AccountLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, status, fetchMe, logout } = useAuthStore();

  useEffect(() => {
    if (status === 'idle') void fetchMe();
  }, [status, fetchMe]);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  if (status === 'idle' || status === 'loading') return LOADING_FALLBACK;

  if (!user) return null;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="w-full shrink-0 rounded-xl border border-slate-100 bg-white p-4 lg:w-56">
          <p className="mb-3 px-2 text-sm font-bold text-slate-800">Hi, {user.name.split(' ')[0]}</p>
          <nav aria-label="Account" className="space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active ? 'brand-gradient text-white' : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <item.icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => void logout().then(() => router.push('/'))}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Logout
            </button>
          </nav>
        </aside>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
