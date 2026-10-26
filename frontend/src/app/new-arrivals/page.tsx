import type { Metadata } from 'next';
import { DEMO_ON_SERVER } from '@/demo/config';
import { DemoPage } from '@/demo/DemoPage';
import NewArrivalsPage from './NewArrivalsPage';

export const metadata: Metadata = {
  title: 'New Arrivals',
  description: 'The latest smartphones, laptops, and gadgets just added to Maroon.',
};

export default function Page() {
  return DEMO_ON_SERVER ? <DemoPage route="newArrivals" /> : <NewArrivalsPage />;
}
