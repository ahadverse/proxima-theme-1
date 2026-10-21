import { useEffect, useRef } from 'react';
import { Controller, useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RotateCcw } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { applyTheme } from '@/lib/theme';
import { DEFAULT_THEME } from '@/lib/themePalette';
import type { AdminSettings, ThemeTokens } from '@/types/settings';
import { SectionShell, SubSection } from './parts';
import { useSettingsSection, type SectionProps } from './useSettingsSection';

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const hex = z.string().trim().regex(HEX, 'Use a hex colour like #6b3410');

const schema = z.object({
  bgDark: hex,
  surfaceDark: hex,
  primary: hex,
  primaryDark: hex,
  accent: hex,
  gradientFrom: hex,
  gradientTo: hex,
  card: hex,
  textOnDark: hex,
  textMuted: hex,
});
type FormValues = z.infer<typeof schema>;

const GROUPS: { title: string; description: string; tokens: { key: keyof ThemeTokens; label: string }[] }[] = [
  {
    title: 'Brand',
    description: 'Buttons, links, badges and highlights.',
    tokens: [
      { key: 'primary', label: 'Primary' },
      { key: 'primaryDark', label: 'Primary (dark)' },
      { key: 'accent', label: 'Accent' },
      { key: 'gradientFrom', label: 'Gradient start' },
      { key: 'gradientTo', label: 'Gradient end' },
    ],
  },
  {
    title: 'Surfaces',
    description: 'Page and panel backgrounds.',
    tokens: [
      { key: 'bgDark', label: 'Page background' },
      { key: 'surfaceDark', label: 'Dark surface' },
      { key: 'card', label: 'Card' },
    ],
  },
  {
    title: 'Text',
    description: 'Copy on dark surfaces.',
    tokens: [
      { key: 'textOnDark', label: 'Text on dark' },
      { key: 'textMuted', label: 'Muted text' },
    ],
  },
];

const toForm = (s: AdminSettings): FormValues => ({
  bgDark: s.theme?.bgDark ?? DEFAULT_THEME.bgDark,
  surfaceDark: s.theme?.surfaceDark ?? DEFAULT_THEME.surfaceDark,
  primary: s.theme?.primary ?? DEFAULT_THEME.primary,
  primaryDark: s.theme?.primaryDark ?? DEFAULT_THEME.primaryDark,
  accent: s.theme?.accent ?? DEFAULT_THEME.accent,
  gradientFrom: s.theme?.gradientFrom ?? DEFAULT_THEME.gradientFrom,
  gradientTo: s.theme?.gradientTo ?? DEFAULT_THEME.gradientTo,
  card: s.theme?.card ?? DEFAULT_THEME.card,
  textOnDark: s.theme?.textOnDark ?? DEFAULT_THEME.textOnDark,
  textMuted: s.theme?.textMuted ?? DEFAULT_THEME.textMuted,
});

/** The colour input only understands 6-digit hex, so expand #abc and fall back to black for half-typed values. */
function swatchValue(value: string): string {
  const v = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return v;
  if (/^#[0-9a-f]{3}$/i.test(v)) return '#' + v.slice(1).replace(/./g, (c) => c + c);
  return '#000000';
}

/** Dark text for a light colour, white for a dark one. */
function inkFor(colour: string): string {
  const n = parseInt(swatchValue(colour).slice(1), 16);
  const luma = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return luma > 160 ? '#1a1310' : '#ffffff';
}

/** Whatever has been typed so far, with any not-yet-valid colour held at its saved value. */
function usableTheme(draft: Partial<Record<keyof ThemeTokens, string>>, saved: ThemeTokens): ThemeTokens {
  const out = { ...saved };
  for (const key of Object.keys(saved) as (keyof ThemeTokens)[]) {
    const value = draft[key]?.trim();
    if (value && HEX.test(value)) out[key] = value;
  }
  return out;
}

function ColorField({
  control,
  name,
  label,
  error,
}: {
  control: Control<FormValues>;
  name: keyof FormValues;
  label: string;
  error?: string;
}) {
  return (
    <FormField label={label} error={error}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label={`${label} colour picker`}
              value={swatchValue(field.value)}
              onChange={(e) => field.onChange(e.target.value)}
              className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-field-border bg-field p-1"
            />
            <Input
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              maxLength={7}
              spellCheck={false}
              className="font-mono"
              error={error}
            />
          </div>
        )}
      />
    </FormField>
  );
}

function ThemePreview({ theme, storeName }: { theme: ThemeTokens; storeName: string }) {
  const gradient = `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})`;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200" style={{ background: theme.bgDark }}>
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: theme.surfaceDark, color: theme.textOnDark }}
      >
        <span className="text-sm font-bold">{storeName}</span>
        <span className="text-xs" style={{ color: theme.textMuted }}>
          Shop · Deals · Track order
        </span>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <div className="rounded-lg p-3" style={{ background: theme.card, color: inkFor(theme.card) }}>
          <div className="mb-3 h-16 rounded-md" style={{ background: gradient }} />
          <p className="text-sm font-semibold">Wireless Headphones</p>
          <p className="mt-0.5 flex items-center gap-2 text-sm font-bold" style={{ color: theme.primary }}>
            ৳4,990
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: theme.accent, color: inkFor(theme.accent) }}
            >
              -20%
            </span>
          </p>
          <span
            className="mt-3 inline-block rounded-md px-3 py-1.5 text-xs font-semibold"
            style={{ background: gradient, color: inkFor(theme.primary) }}
          >
            Add to cart
          </span>
        </div>
        <div
          className="flex flex-col justify-between rounded-lg p-3"
          style={{ background: theme.surfaceDark, color: theme.textOnDark }}
        >
          <div>
            <p className="text-sm font-semibold">Flash sale</p>
            <p className="mt-0.5 text-xs" style={{ color: theme.textMuted }}>
              Ends in 02:14:09
            </p>
          </div>
          <span
            className="mt-3 inline-block self-start rounded-md px-3 py-1.5 text-xs font-semibold"
            style={{ background: theme.accent, color: inkFor(theme.accent) }}
          >
            Shop now
          </span>
        </div>
      </div>
    </div>
  );
}

export function AppearanceSection({ settings, onDirtyChange }: SectionProps) {
  const {
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(settings) });
  const { save, isSaving } = useSettingsSection({ reset, settings, slice: [settings.theme], toForm });

  const draft = watch();
  const savedTheme = settings.theme ?? DEFAULT_THEME;

  // Live preview: while there are unsaved colour edits, the whole admin panel wears them (the
  // panel's palette is derived from the same theme). It goes back to the saved theme on Discard
  // or when leaving the page — never left behind, never saved until the Save button is pressed.
  const isPreviewing = useRef(false);
  const savedThemeRef = useRef(savedTheme);
  useEffect(() => {
    savedThemeRef.current = savedTheme;
  }, [savedTheme]);

  const draftKey = JSON.stringify(draft);
  useEffect(() => {
    if (isDirty) {
      applyTheme(usableTheme(draft, savedThemeRef.current));
      isPreviewing.current = true;
    } else if (isPreviewing.current) {
      applyTheme(savedThemeRef.current);
      isPreviewing.current = false;
    }
    // `draft` is covered by `draftKey`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, draftKey]);

  useEffect(
    () => () => {
      if (isPreviewing.current) applyTheme(savedThemeRef.current);
    },
    []
  );

  function resetToDefaults() {
    for (const key of Object.keys(DEFAULT_THEME) as (keyof ThemeTokens)[]) {
      setValue(key, DEFAULT_THEME[key], { shouldDirty: true, shouldValidate: true });
    }
  }

  return (
    <SectionShell
      sectionKey="appearance"
      title="Appearance"
      description="The storefront's colours. This admin panel follows the same theme, so you see your changes here first."
      isDirty={isDirty}
      isSaving={isSaving}
      onDirtyChange={onDirtyChange}
      onDiscard={() => reset(toForm(settings))}
      onSubmit={handleSubmit((values) =>
        save(
          { theme: values },
          {
            successMessage: 'Theme saved',
            // What is on screen already is the saved theme — nothing to roll back.
            onSaved: () => {
              isPreviewing.current = false;
            },
          }
        )
      )}
    >
      <div className="space-y-2">
        <ThemePreview theme={usableTheme(draft, savedTheme)} storeName={settings.storeName || 'Your store'} />
        <p className="text-xs text-slate-400">
          Indicative preview. Edits also repaint this admin as you make them; nothing is saved until you press
          Save, and the storefront picks the new colours up on its next page load.
        </p>
      </div>

      {GROUPS.map((group) => (
        <SubSection key={group.title} title={group.title} description={group.description}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {group.tokens.map(({ key, label }) => (
              <ColorField key={key} control={control} name={key} label={label} error={errors[key]?.message} />
            ))}
          </div>
        </SubSection>
      ))}

      <div>
        <Button type="button" variant="ghost" size="sm" onClick={resetToDefaults}>
          <RotateCcw className="h-3.5 w-3.5" /> Reset to default colours
        </Button>
      </div>
    </SectionShell>
  );
}
