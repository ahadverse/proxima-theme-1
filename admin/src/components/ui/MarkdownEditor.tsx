import { lazy, Suspense, useRef, useState, type KeyboardEvent } from 'react';
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  type LucideIcon,
} from 'lucide-react';
import { Textarea } from '@/components/ui/Textarea';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

// The renderer (react-markdown + remark-gfm) is only needed once someone opens Preview.
const MarkdownPreview = lazy(() => import('./MarkdownPreview'));

interface Edit {
  value: string;
  selStart: number;
  selEnd: number;
}
type EditFn = (value: string, start: number, end: number) => Edit;

/** Wraps the selection (or a placeholder) — e.g. **bold**. */
function wrap(before: string, after: string, placeholder: string): EditFn {
  return (value, start, end) => {
    const selected = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    return { value: next, selStart: start + before.length, selEnd: start + before.length + selected.length };
  };
}

/**
 * Prefixes every selected line, or strips the prefix if they all have it already (a toggle).
 * `strip` removes whatever marker a line already carries before the new one goes on, so turning a
 * "### " line into a "## " one doesn't stack them.
 */
function prefixLines(prefix: (index: number) => string, matches: RegExp, strip: RegExp = matches): EditFn {
  return (value, start, end) => {
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const nextBreak = value.indexOf('\n', end);
    const lineEnd = nextBreak === -1 ? value.length : nextBreak;
    const lines = value.slice(lineStart, lineEnd).split('\n');

    const allPrefixed = lines.every((l) => !l.trim() || matches.test(l));
    const edited = lines
      .map((line, i) => {
        if (!line.trim()) return line;
        return allPrefixed ? line.replace(matches, '') : prefix(i) + line.replace(strip, '');
      })
      .join('\n');

    return {
      value: value.slice(0, lineStart) + edited + value.slice(lineEnd),
      selStart: lineStart,
      selEnd: lineStart + edited.length,
    };
  };
}

const link: EditFn = (value, start, end) => {
  const selected = value.slice(start, end);
  const text = selected || 'link text';
  const url = 'https://';
  const next = `${value.slice(0, start)}[${text}](${url})${value.slice(end)}`;
  // Leave the URL selected so it can be typed straight over.
  const urlStart = start + text.length + 3;
  return { value: next, selStart: urlStart, selEnd: urlStart + url.length };
};

const TOOLS: { key: string; label: string; icon: LucideIcon; edit: EditFn }[] = [
  { key: 'bold', label: 'Bold (Ctrl+B)', icon: Bold, edit: wrap('**', '**', 'bold text') },
  { key: 'italic', label: 'Italic (Ctrl+I)', icon: Italic, edit: wrap('*', '*', 'italic text') },
  { key: 'h2', label: 'Heading', icon: Heading2, edit: prefixLines(() => '## ', /^##\s+/, /^#{1,6}\s+/) },
  { key: 'h3', label: 'Sub-heading', icon: Heading3, edit: prefixLines(() => '### ', /^###\s+/, /^#{1,6}\s+/) },
  { key: 'ul', label: 'Bulleted list', icon: List, edit: prefixLines(() => '- ', /^[-*]\s+/) },
  { key: 'ol', label: 'Numbered list', icon: ListOrdered, edit: prefixLines((i) => `${i + 1}. `, /^\d+\.\s+/) },
  { key: 'quote', label: 'Quote', icon: Quote, edit: prefixLines(() => '> ', /^>\s?/) },
  { key: 'link', label: 'Link (Ctrl+K)', icon: Link2, edit: link },
];

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  error?: string;
}

/**
 * A small Markdown editor: a formatting toolbar over a plain textarea, with a rendered Preview tab.
 * The text is stored as Markdown (plain paragraphs are valid Markdown, so older plain-text content
 * needs no migration) and the storefront renders it the same way.
 */
export function MarkdownEditor({ value, onChange, placeholder, rows = 14, error }: MarkdownEditorProps) {
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function apply(edit: EditFn) {
    const el = textareaRef.current;
    if (!el) return;
    const result = edit(value, el.selectionStart, el.selectionEnd);
    onChange(result.value);
    // The textarea re-renders with the new value first; only then can the selection be restored.
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.selStart, result.selEnd);
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const shortcut = { b: 'bold', i: 'italic', k: 'link' }[e.key.toLowerCase()];
    const tool = TOOLS.find((t) => t.key === shortcut);
    if (!tool) return;
    e.preventDefault();
    apply(tool.edit);
  }

  return (
    <div>
      <div
        className={cn(
          'overflow-hidden rounded-lg border border-field-border bg-field focus-within:border-brand-accent focus-within:ring-1 focus-within:ring-brand-accent',
          error && 'border-red-500 focus-within:border-red-500 focus-within:ring-red-500'
        )}
      >
        <div className="flex flex-wrap items-center gap-1 border-b border-field-border px-2 py-1.5">
          <div role="tablist" className="mr-2 flex rounded-md bg-slate-200 p-0.5 text-xs font-medium">
            {(['write', 'preview'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn(
                  'rounded px-2.5 py-1 capitalize transition-colors',
                  tab === t ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === 'write' &&
            TOOLS.map((tool) => (
              <button
                key={tool.key}
                type="button"
                title={tool.label}
                aria-label={tool.label}
                // Keep the textarea's selection — a click would otherwise blur it first.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => apply(tool.edit)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
              >
                <tool.icon className="h-4 w-4" />
              </button>
            ))}
        </div>

        {tab === 'write' ? (
          <Textarea
            ref={textareaRef}
            rows={rows}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            className="rounded-none border-0 font-mono text-[13px] leading-relaxed focus:ring-0"
          />
        ) : (
          <div className="px-4 py-3" style={{ minHeight: `${rows * 1.4}rem` }}>
            <Suspense fallback={<Skeleton className="h-32 w-full" />}>
              <MarkdownPreview value={value} />
            </Suspense>
          </div>
        )}
      </div>
      <p className="mt-1.5 text-xs text-slate-400">
        Formatting uses Markdown: **bold**, *italic*, ## headings, - lists, [links](https://…). Use the
        toolbar if you'd rather not type it.
      </p>
    </div>
  );
}
