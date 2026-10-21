import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Controller, useFieldArray, useForm, useWatch, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useStaticPages } from '@/api/staticPages';
import type { AdminSettings } from '@/types/settings';
import type { StaticPage } from '@/types/page';
import { SectionShell } from './parts';
import { useSettingsSection, type SectionProps } from './useSettingsSection';

// Same rule as the API: a site path, or a plain web / mail / phone link — never javascript: or //host.
const HREF = /^(\/(?!\/)|https?:\/\/|mailto:|tel:)/i;

const schema = z.object({
  sections: z
    .array(
      z.object({
        title: z.string().trim().min(1, 'Give the section a title').max(60, 'Keep it under 60 characters'),
        links: z
          .array(
            z.object({
              label: z.string().trim().min(1, 'Name this link').max(80, 'Keep it under 80 characters'),
              href: z
                .string()
                .trim()
                .min(1, 'Choose where this link goes')
                .max(300)
                .regex(HREF, 'Use a page path like /about, or a full link like https://…'),
            })
          )
          .max(30, 'A section can hold up to 30 links'),
      })
    )
    .max(8, 'The footer can hold up to 8 sections'),
});
type FormValues = z.infer<typeof schema>;

const toForm = (s: AdminSettings): FormValues => ({
  sections: (s.footer?.sections ?? []).map((section) => ({
    title: section.title,
    links: section.links.map((l) => ({ label: l.label, href: l.href })),
  })),
});

interface Target {
  label: string;
  href: string;
}

/** The storefront's own pages that aren't text pages edited under Static Pages. */
const STORE_PAGES: Target[] = [
  { label: 'Contact Us', href: '/contact' },
  { label: 'Track Order', href: '/track-order' },
  { label: 'All Products', href: '/products' },
  { label: 'All Brands', href: '/brands' },
  { label: 'New Arrivals', href: '/new-arrivals' },
  { label: 'Deals & Offers', href: '/deals' },
  { label: 'Blogs', href: '/blog' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Store Locations', href: '/store-locations' },
];

/** Text pages the storefront has its own route for — they exist whether or not they were ever edited. */
const BUILT_IN_PAGES: Target[] = [
  { label: 'About Us', href: '/about' },
  { label: 'Return & Exchange', href: '/return-exchange' },
  { label: 'Warranty & Shipping', href: '/warranty-shipping' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms & Conditions', href: '/terms-conditions' },
];

const CUSTOM = '__custom';

function buildGroups(pages: StaticPage[] | undefined) {
  const yourPages: Target[] = (pages ?? [])
    .filter((p) => !p.isSystem)
    .map((p) => ({ label: p.title, href: `/pages/${p.slug}` }));
  // The link address of every page whose text is written under Static Pages → the page to open for editing.
  const editableIds = new Map((pages ?? []).map((p) => [p.isSystem ? `/${p.slug}` : `/pages/${p.slug}`, p._id]));
  return { storePages: STORE_PAGES, builtIn: BUILT_IN_PAGES, yourPages, editableIds };
}

type Groups = ReturnType<typeof buildGroups>;

/** Where a link goes: one of the store's pages, or any address typed in. */
function TargetField({
  value,
  onChange,
  groups,
  error,
}: {
  value: string;
  onChange: (href: string) => void;
  groups: Groups;
  error?: string;
}) {
  const all = [...groups.storePages, ...groups.builtIn, ...groups.yourPages];
  const known = all.find((t) => t.href === value);
  // Picking "Custom link…" keeps the current address to edit; without this it would snap straight back to the list.
  const [forceCustom, setForceCustom] = useState(false);
  const isCustom = forceCustom || !known;

  return (
    <div className="space-y-1.5">
      <Select
        aria-label="Link goes to"
        value={isCustom ? CUSTOM : value}
        onChange={(e) => {
          if (e.target.value === CUSTOM) {
            setForceCustom(true);
            return;
          }
          setForceCustom(false);
          onChange(e.target.value);
        }}
        error={error}
      >
        <optgroup label="Store pages">
          {groups.storePages.map((t) => (
            <option key={t.href} value={t.href}>
              {t.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="Text pages">
          {groups.builtIn.map((t) => (
            <option key={t.href} value={t.href}>
              {t.label}
            </option>
          ))}
        </optgroup>
        {groups.yourPages.length > 0 && (
          <optgroup label="Your pages">
            {groups.yourPages.map((t) => (
              <option key={t.href} value={t.href}>
                {t.label}
              </option>
            ))}
          </optgroup>
        )}
        <option value={CUSTOM}>Custom link…</option>
      </Select>
      {isCustom && (
        <Input
          aria-label="Custom link address"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/pages/careers  or  https://example.com"
          spellCheck={false}
          error={error}
        />
      )}
      {error && (
        <p role="alert" className="text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

function SectionEditor({
  index,
  count,
  control,
  register,
  errors,
  groups,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  groups: Groups;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const { fields, append, remove, move } = useFieldArray({ control, name: `sections.${index}.links` });
  const links = useWatch({ control, name: `sections.${index}.links` });
  const sectionErrors = errors.sections?.[index];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <FormField label={`Section ${index + 1} title`} error={sectionErrors?.title?.message}>
            <Input {...register(`sections.${index}.title`)} placeholder="Customer Service" />
          </FormField>
        </div>
        <div className="mt-6 flex shrink-0 gap-0.5">
          <IconButton title="Move section up" aria-label="Move section up" disabled={index === 0} onClick={() => onMove(index - 1)} className="disabled:opacity-30">
            <ChevronUp className="h-4 w-4" />
          </IconButton>
          <IconButton title="Move section down" aria-label="Move section down" disabled={index === count - 1} onClick={() => onMove(index + 1)} className="disabled:opacity-30">
            <ChevronDown className="h-4 w-4" />
          </IconButton>
          <IconButton tone="red" title="Delete section" aria-label={`Delete section ${index + 1}`} onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {fields.length === 0 && (
          <p className="text-sm text-slate-400">No links yet — a section with no links is left out of the footer.</p>
        )}
        {fields.map((field, j) => {
          const linkErrors = sectionErrors?.links?.[j];
          // A link to a text page (About, Privacy Policy, one of your own…) can open that page's editor.
          const pageId = groups.editableIds.get(links?.[j]?.href ?? '');
          return (
            <div key={field.id} className="grid items-start gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto]">
              <FormField label="Link name" error={linkErrors?.label?.message}>
                <Input {...register(`sections.${index}.links.${j}.label`)} placeholder="Contact Us" />
              </FormField>
              <div>
                <span className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase">Goes to</span>
                <Controller
                  control={control}
                  name={`sections.${index}.links.${j}.href`}
                  render={({ field: hrefField }) => (
                    <TargetField value={hrefField.value} onChange={hrefField.onChange} groups={groups} error={linkErrors?.href?.message} />
                  )}
                />
              </div>
              <div className="flex gap-0.5 sm:mt-7">
                {pageId ? (
                  // A new tab, so edits to this menu that are not saved yet are not lost.
                  <Link
                    to={`/pages/${pageId}/edit`}
                    target="_blank"
                    rel="noopener"
                    title="Edit this page's text (opens in a new tab)"
                    aria-label="Edit this page's text"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 transition-all hover:bg-blue-50 hover:text-blue-700 active:scale-90 dark:text-blue-400 dark:hover:bg-blue-500/15 dark:hover:text-blue-300"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                ) : (
                  // Keeps the buttons of every row in one column.
                  <span aria-hidden className="h-8 w-8" />
                )}
                <IconButton title="Move link up" aria-label="Move link up" disabled={j === 0} onClick={() => move(j, j - 1)} className="disabled:opacity-30">
                  <ChevronUp className="h-4 w-4" />
                </IconButton>
                <IconButton title="Move link down" aria-label="Move link down" disabled={j === fields.length - 1} onClick={() => move(j, j + 1)} className="disabled:opacity-30">
                  <ChevronDown className="h-4 w-4" />
                </IconButton>
                <IconButton tone="red" title="Delete link" aria-label="Delete link" onClick={() => remove(j)}>
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            </div>
          );
        })}
        {errors.sections?.[index]?.links?.message && (
          <p role="alert" className="text-xs text-red-500">{errors.sections[index]?.links?.message}</p>
        )}
        <Button type="button" variant="secondary" size="sm" onClick={() => append({ label: '', href: '/' })}>
          <Plus className="h-3.5 w-3.5" /> Add link
        </Button>
      </div>
    </div>
  );
}

export function FooterSection({ settings, onDirtyChange }: SectionProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(settings) });
  const { save, isSaving } = useSettingsSection({ reset, settings, slice: [settings.footer], toForm });
  const { fields, append, remove, move } = useFieldArray({ control, name: 'sections' });

  const { data: pages } = useStaticPages();
  const groups = useMemo(() => buildGroups(pages), [pages]);

  return (
    <SectionShell
      sectionKey="footer"
      title="Footer menu"
      description="The link columns at the bottom of your storefront. Name each section, then add links to your pages. Click the pencil beside a link to edit that page's text; add and delete pages under Static Pages."
      isDirty={isDirty}
      isSaving={isSaving}
      onDirtyChange={onDirtyChange}
      onDiscard={() => reset(toForm(settings))}
      onSubmit={handleSubmit((values) => save({ footer: { sections: values.sections } }, { successMessage: 'Footer saved' }))}
    >
      <div className="space-y-4">
        {fields.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">
            The footer menu is empty. Add a section to show link columns on your storefront.
          </p>
        )}
        {fields.map((field, index) => (
          <SectionEditor
            key={field.id}
            index={index}
            count={fields.length}
            control={control}
            register={register}
            errors={errors}
            groups={groups}
            onMove={(to) => move(index, to)}
            onRemove={() => remove(index)}
          />
        ))}
        {errors.sections?.message && (
          <p role="alert" className="text-xs text-red-500">{errors.sections.message}</p>
        )}
        <Button
          type="button"
          variant="secondary"
          disabled={fields.length >= 8}
          onClick={() => append({ title: '', links: [{ label: '', href: '/' }] })}
        >
          <Plus className="h-4 w-4" /> Add section
        </Button>
      </div>
    </SectionShell>
  );
}
