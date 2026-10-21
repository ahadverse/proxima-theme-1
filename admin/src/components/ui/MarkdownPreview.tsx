import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Styled to read like the storefront's rendering of the same text (headings, lists, links), using
// the admin's own tokens so it works in both colour modes. Raw HTML in the text is not rendered.
const components: Components = {
  h1: (props) => <h2 className="text-xl font-bold text-slate-900" {...props} />,
  h2: (props) => <h2 className="text-lg font-bold text-slate-900" {...props} />,
  h3: (props) => <h3 className="text-base font-bold text-slate-800" {...props} />,
  h4: (props) => <h4 className="text-sm font-bold text-slate-800" {...props} />,
  p: (props) => <p className="leading-relaxed" {...props} />,
  ul: (props) => <ul className="list-disc space-y-1 pl-5" {...props} />,
  ol: (props) => <ol className="list-decimal space-y-1 pl-5" {...props} />,
  a: (props) => <a className="font-medium text-brand-ink underline" target="_blank" rel="noreferrer" {...props} />,
  blockquote: (props) => (
    <blockquote className="border-l-4 border-slate-300 pl-4 text-slate-500 italic" {...props} />
  ),
  hr: () => <hr className="border-slate-200" />,
  img: ({ alt, ...props }) => <img alt={alt ?? ''} className="max-w-full rounded-lg" {...props} />,
  code: (props) => <code className="rounded bg-slate-200 px-1 py-0.5 font-mono text-[0.85em]" {...props} />,
  pre: (props) => <pre className="overflow-x-auto rounded-lg bg-slate-200 p-3 font-mono text-xs" {...props} />,
  table: (props) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm" {...props} />
    </div>
  ),
  th: (props) => <th className="border border-slate-300 bg-slate-200 px-3 py-1.5 font-semibold" {...props} />,
  td: (props) => <td className="border border-slate-300 px-3 py-1.5" {...props} />,
};

export default function MarkdownPreview({ value }: { value: string }) {
  if (!value.trim()) {
    return <p className="text-sm text-slate-400">Nothing to preview yet.</p>;
  }
  return (
    <div className="space-y-3 text-sm text-slate-700">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {value}
      </ReactMarkdown>
    </div>
  );
}
