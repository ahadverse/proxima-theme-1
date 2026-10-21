import { cache } from 'react';
import { apiGetResult } from '@/lib/api';
import { placeholderBlogPosts, type BlogPost } from '@/lib/placeholder-blog';

interface RawBlogPost {
  slug: string;
  title: string;
  excerpt?: string;
  content?: string;
  coverImage?: string;
  tags?: string[];
  publishedAt: string;
  seo?: { metaTitle?: string; metaDescription?: string };
}

function mapPost(raw: RawBlogPost): BlogPost {
  return {
    slug: raw.slug,
    title: raw.title,
    excerpt: raw.excerpt ?? '',
    content: raw.content,
    coverImage: raw.coverImage || undefined,
    tags: raw.tags ?? [],
    publishedAt: raw.publishedAt,
    seo: raw.seo,
  };
}

/**
 * Published posts, newest first. The demo posts appear only when the API can't be reached — a
 * store that has published nothing gets an empty list, not someone else's articles.
 */
export async function getBlogPosts(): Promise<BlogPost[]> {
  const { data } = await apiGetResult<RawBlogPost[]>('/blog', { revalidate: 60 });
  return data ? data.map(mapPost) : placeholderBlogPosts;
}

/** One published post, or null if it doesn't exist (draft, deleted, or never was). */
export const getBlogPost = cache(async (slug: string): Promise<BlogPost | null> => {
  const { status, data } = await apiGetResult<RawBlogPost>(`/blog/${encodeURIComponent(slug)}`, { revalidate: 60 });
  if (data) return mapPost(data);
  // A 404 is the server saying no. Only an unreachable server falls back to the demo posts.
  if (status === 404) return null;
  return placeholderBlogPosts.find((p) => p.slug === slug) ?? null;
});
