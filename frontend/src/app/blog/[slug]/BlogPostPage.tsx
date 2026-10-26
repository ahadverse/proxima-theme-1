import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { JsonLd } from '@/components/seo/JsonLd';
import { Markdown } from '@/components/ui/Markdown';
import { getBlogPost } from '@/lib/blog';
import { SITE_URL } from '@/lib/site';

export default async function BlogPostPage({ params }: PageProps<'/blog/[slug]'>) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.excerpt,
          datePublished: post.publishedAt,
          mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
          ...(post.coverImage ? { image: [post.coverImage] } : {}),
        }}
      />
      <Breadcrumb items={[{ label: 'Blog', href: '/blog' }, { label: post.title }]} />
      <p className="mb-2 text-xs text-brand-text-muted">
        {new Date(post.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
      <h1 className="mb-6 text-2xl font-bold text-white md:text-3xl">{post.title}</h1>

      {post.coverImage && (
        <div className="relative mb-6 aspect-[16/9] overflow-hidden rounded-xl bg-slate-100">
          <Image src={post.coverImage} alt="" fill sizes="(min-width: 768px) 768px, 100vw" className="object-cover" priority />
        </div>
      )}

      <div className="rounded-xl border border-slate-100 bg-white p-6 text-sm leading-relaxed text-slate-600">
        <Markdown>{post.content ?? ''}</Markdown>
      </div>

      {post.tags && post.tags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-brand-text-muted">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
