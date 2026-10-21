import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { ProsePage } from '@/components/layout/ProsePage';
import { Markdown } from '@/components/ui/Markdown';
import { RichText } from '@/components/ui/RichText';
import { getCmsPage } from '@/lib/cms';

/**
 * A text page whose title and body are edited in the admin (Static Pages).
 *
 * `fallback` is the built-in copy for pages the storefront links to directly: it shows when the
 * page isn't in the database yet or the API can't be reached. Without one, a page that doesn't
 * exist is a 404.
 */
export async function CmsPage({
  slug,
  fallback,
}: {
  slug: string;
  fallback?: { title: string; children: ReactNode };
}) {
  const { data } = await getCmsPage(slug);

  if (data) {
    return (
      <ProsePage title={data.title}>
        {data.contentFormat === 'html' ? <RichText html={data.content} /> : <Markdown>{data.content}</Markdown>}
      </ProsePage>
    );
  }
  if (fallback) return <ProsePage title={fallback.title}>{fallback.children}</ProsePage>;
  notFound();
}
