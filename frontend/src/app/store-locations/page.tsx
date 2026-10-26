import type { Metadata } from 'next';
import { DEMO_ON_SERVER } from '@/demo/config';
import { DemoPage } from '@/demo/DemoPage';
import StoreLocationsPage from './StoreLocationsPage';

export const metadata: Metadata = { title: 'Store Locations' };

export default function Page() {
  return DEMO_ON_SERVER ? <DemoPage route="storeLocations" /> : <StoreLocationsPage />;
}
