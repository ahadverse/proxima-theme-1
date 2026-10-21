import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import type { AdminSettings } from '@/types/settings';
import { SecretField, SectionShell, SubSection } from './parts';
import { useSettingsSection, type SectionProps } from './useSettingsSection';

// Same shapes the API accepts: Google issues exactly these, and they are written into the storefront's pages.
const optional = (pattern: RegExp, message: string) => z.string().trim().refine((v) => !v || pattern.test(v), message);

const schema = z.object({
  facebook: z.object({
    pixelId: optional(/^\d{8,20}$/, 'A Pixel ID is only digits'),
    conversionsApiAccessToken: z.string().trim(),
    testEventCode: z.string().trim(),
  }),
  google: z.object({
    analyticsId: optional(/^G-[A-Z0-9]{4,20}$/, 'A Measurement ID looks like G-XXXXXXXXXX'),
    adsId: optional(/^AW-\d{6,15}$/, 'A Conversion ID looks like AW-123456789'),
    adsPurchaseLabel: optional(/^[A-Za-z0-9_-]{6,40}$/, 'A conversion label is letters, numbers, - and _'),
  }),
});
type FormValues = z.infer<typeof schema>;

const toForm = (s: AdminSettings): FormValues => ({
  facebook: {
    pixelId: s.facebookPixel?.pixelId ?? '',
    conversionsApiAccessToken: s.facebookPixel?.conversionsApiAccessToken ?? '',
    testEventCode: s.facebookPixel?.testEventCode ?? '',
  },
  google: {
    analyticsId: s.googleTag?.analyticsId ?? '',
    adsId: s.googleTag?.adsId ?? '',
    adsPurchaseLabel: s.googleTag?.adsPurchaseLabel ?? '',
  },
});

export function TrackingSection({ settings, onDirtyChange }: SectionProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(settings) });
  const { save, isSaving } = useSettingsSection({
    reset,
    settings,
    slice: [settings.facebookPixel, settings.googleTag],
    toForm,
  });

  return (
    <SectionShell
      sectionKey="tracking"
      title="Tracking — Facebook & Google"
      description="Report storefront activity to your ad accounts: product views, add to cart, checkout started and purchases. Leave an ID blank to turn that tag off."
      isDirty={isDirty}
      isSaving={isSaving}
      onDirtyChange={onDirtyChange}
      onDiscard={() => reset(toForm(settings))}
      onSubmit={handleSubmit((values) => save({ facebookPixel: values.facebook, googleTag: values.google }))}
    >
      <SubSection
        title="Facebook Pixel & Conversions API"
        description="The Pixel runs in the visitor's browser; the Conversions API sends purchases from your server as a backup."
      >
        <div className="max-w-2xl space-y-4">
          <FormField label="Pixel ID" error={errors.facebook?.pixelId?.message} hint="Events Manager → Data sources → your Pixel">
            <Input {...register('facebook.pixelId')} placeholder="123456789012345" inputMode="numeric" />
          </FormField>
          <SecretField
            control={control}
            name="facebook.conversionsApiAccessToken"
            label="Conversions API access token"
            savedValue={settings.facebookPixel?.conversionsApiAccessToken ?? ''}
            hint="Generated in Events Manager → Settings. Without it, purchases are only reported by the browser Pixel."
          />
          <FormField
            label="Test event code"
            hint="Only while testing in Events Manager's Test Events tab — clear it once you go live"
          >
            <Input {...register('facebook.testEventCode')} placeholder="TEST12345" />
          </FormField>
        </div>
      </SubSection>

      <SubSection
        title="Google Analytics & Google Ads"
        description="Both run in the visitor's browser through Google's tag. Fill in either or both."
      >
        <div className="max-w-2xl space-y-4">
          <FormField
            label="Google Analytics 4 Measurement ID"
            error={errors.google?.analyticsId?.message}
            hint="Analytics → Admin → Data streams → your web stream. Starts with G-"
          >
            <Input {...register('google.analyticsId')} placeholder="G-XXXXXXXXXX" spellCheck={false} autoComplete="off" />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Google Ads Conversion ID"
              error={errors.google?.adsId?.message}
              hint="Google Ads → Goals → Conversions → your Purchase conversion → Tag setup. Starts with AW-"
            >
              <Input {...register('google.adsId')} placeholder="AW-123456789" spellCheck={false} autoComplete="off" />
            </FormField>
            <FormField
              label="Purchase conversion label"
              error={errors.google?.adsPurchaseLabel?.message}
              hint="The text after the slash in AW-123456789/AbCdEfGhIj. Leave blank if Ads imports purchases from Analytics instead — counting both would double them."
            >
              <Input {...register('google.adsPurchaseLabel')} placeholder="AbCdEfGhIjKl" spellCheck={false} autoComplete="off" />
            </FormField>
          </div>
        </div>
      </SubSection>
    </SectionShell>
  );
}
