import Image from 'next/image';
import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { getBlogPosts } from '@/lib/blog';

export default async function BlogListPage() {
  const posts = await getBlogPosts();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
      <Breadcrumb items={[{ label: 'Blog' }]} />
      <h1 className="mb-6 text-2xl font-bold text-white md:text-3xl">Blog</h1>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 p-10 text-center text-sm text-brand-text-muted">
          No articles yet — check back soon.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group overflow-hidden rounded-xl border border-slate-100 bg-white transition-shadow hover:shadow-md"
            >
              {post.coverImage && (
                <div className="relative aspect-[16/9] bg-slate-100">
                  <Image
                    src={post.coverImage}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-5">
                <p className="mb-2 text-xs text-slate-500">
                  {new Date(post.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <h2 className="mb-2 text-lg font-bold text-slate-900 group-hover:text-brand-primary">{post.title}</h2>
                <p className="text-sm text-slate-600">{post.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
