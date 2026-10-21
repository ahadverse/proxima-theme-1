'use client';

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface FaqItem {
  question: string;
  answer: string;
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const baseId = useId();

  return (
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
      {items.map((item, i) => {
        const open = openIndex === i;
        const buttonId = `${baseId}-q${i}`;
        const panelId = `${baseId}-a${i}`;
        return (
          <div key={`${item.question}-${i}`}>
            <h2>
              <button
                type="button"
                id={buttonId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-slate-800"
              >
                {item.question}
                <ChevronDown
                  aria-hidden
                  className={cn('h-4 w-4 shrink-0 text-brand-primary transition-transform', open && 'rotate-180')}
                />
              </button>
            </h2>
            {/* `inert` while closed: the collapsed answer is still in the page for the animation, but
                shouldn't be readable by a screen reader or reachable by Tab. */}
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              inert={!open}
              className={cn('grid overflow-hidden transition-all', open ? 'grid-rows-[1fr] pb-4' : 'grid-rows-[0fr]')}
            >
              <div className="overflow-hidden px-5 text-sm leading-relaxed whitespace-pre-line text-slate-600">{item.answer}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
