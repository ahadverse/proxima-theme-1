import type { Metadata } from 'next';
import { DEMO_ON_SERVER } from '@/demo/config';
import { DemoPage } from '@/demo/DemoPage';
import DealsPage from './DealsPage';

export const metadata: Metadata = {
  title: 'Flash Sale & Deals',
  description: 'Limited-time discounts on smartphones, laptops, and accessories at Maroon.',
};

export default function Page() {
  return DEMO_ON_SERVER ? <DemoPage route="deals" /> : <DealsPage />;
}
