import type { Metadata } from 'next';
import { cmsPageMetadata } from '@/lib/cms';
import { DEMO_ON_SERVER } from '@/demo/config';
import { DemoPage } from '@/demo/DemoPage';
import CustomPage from './CustomPage';

// Pages added from the admin (Static Pages → Add Page) live here; there's no list of them to
// pre-build, so render per request.
export const instant = false;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (DEMO_ON_SERVER) return {};
  const { slug } = await params;
  return cmsPageMetadata(slug);
}

export default function Page(props: Props) {
  return DEMO_ON_SERVER ? <DemoPage route="customPage" /> : <CustomPage {...props} />;
}
