'use client';

import Link from 'next/link';
import { Package, Heart, MapPin } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function AccountDashboardPage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">My Account</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/account/orders" className="rounded-xl border border-slate-100 bg-white p-5 transition-shadow hover:shadow-md">
          <Package className="mb-2 h-5 w-5 text-brand-primary" aria-hidden />
          <p className="font-semibold text-slate-800">My Orders</p>
          <p className="text-xs text-slate-500">Track and review your orders</p>
        </Link>
        <Link href="/account/wishlist" className="rounded-xl border border-slate-100 bg-white p-5 transition-shadow hover:shadow-md">
          <Heart className="mb-2 h-5 w-5 text-brand-primary" aria-hidden />
          <p className="font-semibold text-slate-800">Wishlist</p>
          <p className="text-xs text-slate-500">Products you&apos;ve saved</p>
        </Link>
        <Link href="/account/profile" className="rounded-xl border border-slate-100 bg-white p-5 transition-shadow hover:shadow-md">
          <MapPin className="mb-2 h-5 w-5 text-brand-primary" aria-hidden />
          <p className="font-semibold text-slate-800">Profile &amp; Addresses</p>
          <p className="text-xs text-slate-500">Manage your details</p>
        </Link>
      </div>

      <div className="mt-6 rounded-xl border border-slate-100 bg-white p-5 text-sm text-slate-600">
        <p>
          Signed in as <span className="font-semibold text-slate-800">{user.phone}</span>
          {user.email && <> · {user.email}</>}
        </p>
      </div>
    </div>
  );
}
