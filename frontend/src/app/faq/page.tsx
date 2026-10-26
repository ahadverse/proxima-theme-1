import type { Metadata } from 'next';
import { DEMO_ON_SERVER } from '@/demo/config';
import { DemoPage } from '@/demo/DemoPage';
import FaqPage from './FaqPage';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about ordering, delivery, payment, and warranty at Maroon.',
};

export default function Page() {
  return DEMO_ON_SERVER ? <DemoPage route="faq" /> : <FaqPage />;
}
