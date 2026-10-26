import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { IS_DEMO } from '@/demo/config';
import { DemoPaymentPage } from '@/demo/ui/DemoPaymentPage';

export const metadata: Metadata = { title: 'Payment', robots: { index: false } };

/** The demo's simulated gateway screen (src/demo/engine/handlers/payments.ts). Not part of a normal build of the store. */
export default function Page() {
  if (!IS_DEMO) notFound();
  return <DemoPaymentPage />;
}
