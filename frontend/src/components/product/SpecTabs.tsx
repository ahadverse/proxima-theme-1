'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import type { SpecGroup } from '@/types/catalog';

const SECTIONS = ['Specification', 'Description', 'Warranty'] as const;
type Section = (typeof SECTIONS)[number];

const sectionId = (section: Section) => `product-${section.toLowerCase()}`;

// Not tabs — all three sections are always on the page; these buttons just scroll to
// whichever one you click, and the active label tracks whatever's currently in view.
export function SpecTabs({
  specifications,
  description,
  warrantyInfo,
}: {
  specifications: SpecGroup[];
  description: string;
  warrantyInfo?: string;
}) {
  // A product with no specification groups has no Specification section (or tab) to show.
  const sections = specifications.length > 0 ? SECTIONS : SECTIONS.filter((s) => s !== 'Specification');
  const [active, setActive] = useState<Section>(sections[0]);
  const sectionRefs = useRef<Partial<Record<Section, HTMLElement | null>>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) {
          const match = SECTIONS.find((s) => sectionId(s) === visible.target.id);
          if (match) setActive(match);
        }
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 }
    );

    SECTIONS.forEach((s) => {
      const el = sectionRefs.current[s];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections.length]);

  function scrollToSection(section: Section) {
    sectionRefs.current[section]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div>
      <div className="no-scrollbar mb-6 flex gap-2.5 overflow-x-auto">
        {sections.map((section) => (
          <button
            key={section}
            type="button"
            onClick={() => scrollToSection(section)}
            aria-current={active === section ? 'true' : undefined}
            className={cn(
              'shrink-0 rounded-lg px-4 py-3 text-xs font-bold uppercase tracking-wide transition-colors active:scale-95 motion-reduce:transition-none sm:px-5 sm:text-sm',
              active === section ? 'bg-brand-accent text-black' : 'bg-white text-slate-900 hover:bg-slate-100'
            )}
          >
            {section}
          </button>
        ))}
      </div>

      <div className="space-y-10">
        {specifications.length > 0 && (
          <section
            id={sectionId('Specification')}
            ref={(el) => {
              sectionRefs.current.Specification = el;
            }}
            className="scroll-mt-24 space-y-5"
          >
            <h2 className="sr-only">Specification</h2>
            {specifications.map((group, g) => (
              <div key={`${group.groupName}-${g}`} className="overflow-hidden rounded-xl border border-white/5 bg-brand-bg-dark">
                <h3 className="bg-brand-surface-dark px-5 py-3.5 text-lg font-semibold text-white">{group.groupName}</h3>
                <div>
                  {group.items.map((item, i) => (
                    <div
                      key={`${item.label}-${i}`}
                      className="grid grid-cols-2 gap-3 border-t border-white/5 px-5 py-3.5 text-sm first:border-t-0"
                    >
                      <span className="text-brand-text-muted">{item.label}</span>
                      <span className="min-w-0 break-words font-medium text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        <section
          id={sectionId('Description')}
          ref={(el) => {
            sectionRefs.current.Description = el;
          }}
          className="scroll-mt-24"
        >
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-white">Description</h2>
          <div className="whitespace-pre-line break-words rounded-xl border border-white/5 bg-brand-bg-dark p-6 text-sm leading-relaxed text-brand-text-on-dark">
            {description || 'No description has been added for this product yet.'}
          </div>
        </section>

        <section
          id={sectionId('Warranty')}
          ref={(el) => {
            sectionRefs.current.Warranty = el;
          }}
          className="scroll-mt-24"
        >
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-white">Warranty</h2>
          <div className="whitespace-pre-line break-words rounded-xl border border-white/5 bg-brand-bg-dark p-6 text-sm leading-relaxed text-brand-text-on-dark">
            {warrantyInfo || 'Standard manufacturer warranty applies.'}
          </div>
        </section>
      </div>
    </div>
  );
}
