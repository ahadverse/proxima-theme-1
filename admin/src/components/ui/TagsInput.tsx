import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  max?: number;
}

/** Type a tag and press Enter or comma; Backspace on an empty box removes the last one. */
export function TagsInput({ value, onChange, placeholder = 'Add a tag…', max = 12 }: TagsInputProps) {
  const [draft, setDraft] = useState('');

  function commit(raw: string) {
    const tag = raw.trim().toLowerCase();
    setDraft('');
    if (!tag || value.includes(tag) || value.length >= max) return;
    onChange([...value, tag]);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div
      className={cn(
        'flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-field-border bg-field px-2 py-1.5 transition-colors focus-within:border-brand-accent focus-within:ring-1 focus-within:ring-brand-accent'
      )}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-slate-200 py-0.5 pr-1 pl-2.5 text-xs font-medium text-slate-700"
        >
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-300 hover:text-slate-700"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => commit(draft)}
        disabled={value.length >= max}
        placeholder={value.length >= max ? `Up to ${max} tags` : placeholder}
        className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
      />
    </div>
  );
}
