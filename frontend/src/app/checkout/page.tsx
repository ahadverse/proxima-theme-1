import type { Metadata } from 'next';
import { DEMO_ON_SERVER } from '@/demo/config';
import { DemoPage } from '@/demo/DemoPage';
import CheckoutPage from './CheckoutPage';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

export default function Page() {
  return DEMO_ON_SERVER ? <DemoPage route="checkout" /> : <CheckoutPage />;
}
