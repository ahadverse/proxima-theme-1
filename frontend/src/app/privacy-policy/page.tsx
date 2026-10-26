import type { Metadata } from 'next';
import { cmsPageMetadata } from '@/lib/cms';
import { DEMO_ON_SERVER } from '@/demo/config';
import { DemoPage } from '@/demo/DemoPage';
import PrivacyPolicyPage from './PrivacyPolicyPage';

// Title and text come from the admin (Static Pages). The built-in default copy, in the page's own file, shows if the
// page isn't in the database yet or the API can't be reached.
export async function generateMetadata(): Promise<Metadata> {
  if (DEMO_ON_SERVER) return {};
  return cmsPageMetadata('privacy-policy', 'Privacy Policy');
}

export default function Page() {
  return DEMO_ON_SERVER ? <DemoPage route="privacyPolicy" /> : <PrivacyPolicyPage />;
}
