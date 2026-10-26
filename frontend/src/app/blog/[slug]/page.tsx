import type { Metadata } from 'next';
import { getBlogPost } from '@/lib/blog';
import { DEMO_ON_SERVER } from '@/demo/config';
import { DemoPage } from '@/demo/DemoPage';
import BlogPostPage from './BlogPostPage';

// Backed by live blog content with no static params list — render per request.
export const instant = false;

export async function generateMetadata({ params }: PageProps<'/blog/[slug]'>): Promise<Metadata> {
  if (DEMO_ON_SERVER) return {};
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return {};
  const title = post.seo?.metaTitle || post.title;
  const description = post.seo?.metaDescription || post.excerpt;
  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title,
      description,
      url: `/blog/${post.slug}`,
      publishedTime: post.publishedAt,
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
    },
  };
}

export default function Page(props: PageProps<'/blog/[slug]'>) {
  return DEMO_ON_SERVER ? <DemoPage route="blogPost" /> : <BlogPostPage {...props} />;
}
