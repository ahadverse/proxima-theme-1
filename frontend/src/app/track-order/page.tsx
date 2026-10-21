import { Suspense } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { TrackOrderForm } from '@/components/order/TrackOrderForm';

// Reads `?orderNumber=` per request — no static shell worth prerendering.
export const instant = false;

export default function TrackOrderPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-6 md:px-6 md:py-8">
      <Breadcrumb items={[{ label: 'Track Order' }]} />
      <h1 className="mb-6 text-2xl font-bold text-white md:text-3xl">Track Your Order</h1>
      <Suspense>
        <TrackOrderForm />
      </Suspense>
    </div>
  );
}
