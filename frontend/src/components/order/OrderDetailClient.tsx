'use client';

import { useEffect, useState } from 'react';
import { OrderStatusView } from './OrderStatusView';
import { apiGet } from '@/lib/api';
import type { OrderDetail } from '@/types/order';

export function OrderDetailClient({ id }: { id: string }) {
  const [order, setOrder] = useState<OrderDetail | null | undefined>(undefined);

  useEffect(() => {
    apiGet<OrderDetail>(`/orders/${id}`).then(setOrder);
  }, [id]);

  if (order === undefined) {
    return <div aria-busy="true" className="h-64 animate-pulse rounded-xl bg-white/5" />;
  }

  if (!order) {
    return <p className="text-sm text-brand-text-muted">We couldn&apos;t find that order.</p>;
  }

  return (
    <>
      <h1 className="sr-only">Order details</h1>
      <OrderStatusView order={order} />
    </>
  );
}
