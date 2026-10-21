import type { Metadata } from 'next';
import { CmsPage } from '@/components/layout/CmsPage';
import { cmsPageMetadata } from '@/lib/cms';

// Pages added from the admin (Static Pages → Add Page) live here; there's no list of them to
// pre-build, so render per request.
export const instant = false;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return cmsPageMetadata(slug);
}

export default async function CustomPage({ params }: Props) {
  const { slug } = await params;
  return <CmsPage slug={slug} />;
}
