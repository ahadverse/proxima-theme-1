import type { Metadata } from 'next';
import { DEMO_ON_SERVER } from '@/demo/config';
import { DemoPage } from '@/demo/DemoPage';
import ContactPage from './ContactPage';

export const metadata: Metadata = { title: 'Contact Us' };

export default function Page() {
  return DEMO_ON_SERVER ? <DemoPage route="contact" /> : <ContactPage />;
}
