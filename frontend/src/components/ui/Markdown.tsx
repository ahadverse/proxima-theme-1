import Link from 'next/link';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Styles for admin-written content (static pages, blog posts). The page already supplies the
// h1, so a stray "# heading" in the text is demoted to an h2. Raw HTML in the text is not
// rendered, and react-markdown's default URL filtering drops javascript: links.
const components: Components = {
  h1: (props) => <h2 className="font-bold text-slate-800" {...props} />,
  h2: (props) => <h2 className="font-bold text-slate-800" {...props} />,
  h3: (props) => <h3 className="font-semibold text-slate-800" {...props} />,
  h4: (props) => <h4 className="font-semibold text-slate-700" {...props} />,
  ul: (props) => <ul className="list-disc space-y-1.5 pl-5" {...props} />,
  ol: (props) => <ol className="list-decimal space-y-1.5 pl-5" {...props} />,
  a: ({ href = '', children }) => {
    const className = 'font-medium text-brand-primary underline underline-offset-2 hover:text-brand-accent';
    // Same-site paths stay in the app; anything else leaves in a new tab.
    if (href.startsWith('/') && !href.startsWith('//')) {
      return (
        <Link href={href} className={className}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  },
  blockquote: (props) => (
    <blockquote className="border-l-4 border-brand-accent/60 pl-4 text-slate-500 italic" {...props} />
  ),
  hr: () => <hr className="border-slate-200" />,
  // Admin-uploaded images can come from any host, so a plain <img> rather than next/image.
  // eslint-disable-next-line @next/next/no-img-element
  img: ({ alt, src, title }) => <img src={typeof src === 'string' ? src : undefined} alt={alt ?? ''} title={title} loading="lazy" className="h-auto max-w-full rounded-lg" />,
  code: (props) => <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em]" {...props} />,
  pre: (props) => <pre className="overflow-x-auto rounded-lg bg-slate-100 p-3 font-mono text-xs" {...props} />,
  table: (props) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left" {...props} />
    </div>
  ),
  th: (props) => <th className="border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700" {...props} />,
  td: (props) => <td className="border border-slate-200 px-3 py-2" {...props} />,
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-4">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
