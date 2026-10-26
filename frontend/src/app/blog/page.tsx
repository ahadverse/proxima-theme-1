import type { Metadata } from 'next';
import { DEMO_ON_SERVER } from '@/demo/config';
import { DemoPage } from '@/demo/DemoPage';
import BlogListPage from './BlogListPage';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Technology news, buying guides, and tips from the Maroon team.',
};

export default function Page() {
  return DEMO_ON_SERVER ? <DemoPage route="blog" /> : <BlogListPage />;
}
