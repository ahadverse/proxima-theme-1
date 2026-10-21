import { truncate } from '@/lib/seo';

interface SearchPreviewProps {
  title: string;
  description: string;
  /** The storefront's address, e.g. "https://maroon.shop". */
  siteUrl?: string;
  /** The path after the address, e.g. ["product", "iphone-15"]. */
  path: string[];
}

/**
 * What the page looks like as a Google result, so the title and description can be judged as they are typed.
 * Always drawn on white with Google's own colours — a result looks the same whatever theme the admin is in.
 */
export function SearchPreview({ title, description, siteUrl, path }: SearchPreviewProps) {
  let host = 'yourstore.com';
  try {
    if (siteUrl) host = new URL(siteUrl).host;
  } catch {
    // An unusable address just keeps the placeholder.
  }

  return (
    <figure>
      <figcaption className="mb-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">Search result preview</figcaption>
      <div className="rounded-lg border border-slate-200 p-4" style={{ background: '#ffffff' }}>
        <p className="truncate text-xs" style={{ color: '#202124' }}>
          {host}
          <span style={{ color: '#5f6368' }}> › {path.join(' › ')}</span>
        </p>
        <p className="mt-1 text-lg leading-snug" style={{ color: '#1a0dab' }}>
          {truncate(title, 60)}
        </p>
        <p className="mt-1 text-sm leading-snug" style={{ color: '#4d5156' }}>
          {truncate(description, 160)}
        </p>
      </div>
    </figure>
  );
}
