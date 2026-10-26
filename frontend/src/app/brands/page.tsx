import type { Metadata } from 'next';
import { DEMO_ON_SERVER } from '@/demo/config';
import { DemoPage } from '@/demo/DemoPage';
import BrandsPage from './BrandsPage';

export const metadata: Metadata = {
  title: 'All Brands',
  description: 'Shop every brand carried at Maroon.',
};

export default function Page() {
  return DEMO_ON_SERVER ? <DemoPage route="brands" /> : <BrandsPage />;
}
