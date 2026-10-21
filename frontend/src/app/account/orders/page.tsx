'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { formatBDT } from '@/lib/currency';

interface OrderSummary {
  id: string;
  orderNumber: string;
  orderStatus: string;
  pricing: { grandTotal: number };
  createdAt: string;
}

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);

  const [failed, setFailed] = useState(false);

  useEffect(() => {
    apiGet<OrderSummary[]>('/orders/my').then((data) => {
      if (data) setOrders(data);
      else setFailed(true);
    });
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">My Orders</h1>

      {failed ? (
        <p role="alert" className="text-sm text-red-400">
          We couldn&apos;t load your orders just now. Please refresh the page to try again.
        </p>
      ) : orders === null ? (
        <div aria-busy="true" className="h-32 animate-pulse rounded-xl bg-white/5" />
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/15 py-16 text-center">
          <Package className="h-10 w-10 text-white/20" aria-hidden />
          <p className="text-sm text-brand-text-muted">You haven&apos;t placed any orders yet.</p>
          <Link href="/products" className="text-sm font-semibold text-brand-accent hover:underline">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 transition-shadow hover:shadow-md"
            >
              <div>
                <p className="font-semibold text-slate-800">{order.orderNumber}</p>
                <p className="text-xs capitalize text-slate-500">
                  {order.orderStatus} · {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <p className="font-bold text-brand-primary">{formatBDT(order.pricing.grandTotal)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
