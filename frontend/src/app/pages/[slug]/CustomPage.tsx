import { CmsPage } from '@/components/layout/CmsPage';

type Props = { params: Promise<{ slug: string }> };

export default async function CustomPage({ params }: Props) {
  const { slug } = await params;
  return <CmsPage slug={slug} />;
}
