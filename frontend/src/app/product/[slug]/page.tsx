import type { Metadata } from 'next';
import { DEMO_ON_SERVER } from '@/demo/config';
import { DemoPage } from '@/demo/DemoPage';
import ProductPage, { getProduct, summarize } from './ProductPage';

// Backed by live catalog data with no static params list — render per request.
export const instant = false;

export async function generateMetadata({ params }: PageProps<'/product/[slug]'>): Promise<Metadata> {
  if (DEMO_ON_SERVER) return {};
  const { slug } = await params;
  const result = await getProduct(slug);
  if (!result) return {};
  const { product } = result;

  const title = product.seo?.metaTitle || product.title;
  const description =
    product.seo?.metaDescription ||
    summarize(product.description || product.shortHighlights.join('. ')) ||
    `Buy ${product.title} online at the best price in Bangladesh.`;
  // The share picture chosen in the admin, else the first product photo.
  const image = product.seo?.ogImage || product.images[0]?.url;

  return {
    title,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    // "Hide from search engines" in the product's SEO settings.
    ...(product.seo?.noIndex ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, url: `/product/${product.slug}`, images: image ? [{ url: image }] : undefined },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description, images: image ? [image] : undefined },
  };
}

export default function Page(props: PageProps<'/product/[slug]'>) {
  return DEMO_ON_SERVER ? <DemoPage route="product" /> : <ProductPage {...props} />;
}
