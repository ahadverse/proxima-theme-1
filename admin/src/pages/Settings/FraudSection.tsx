import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import type { AdminSettings } from '@/types/settings';
import { SecretField, SectionShell, SubSection, SwitchField } from './parts';
import { useSettingsSection, type SectionProps } from './useSettingsSection';

const weight = z.coerce.number({ error: 'Enter a number' }).min(0, 'Between 0 and 1').max(1, 'Between 0 and 1');

const schema = z
  .object({
    internalWeight: weight,
    externalWeight: weight,
    thirdPartyEnabled: z.boolean(),
    thirdPartyProvider: z
      .string()
      .trim()
      .refine((v) => !v || /^https?:\/\/\S+$/i.test(v), 'Enter the full endpoint URL, starting with https://'),
    thirdPartyApiKey: z.string().trim(),
  })
  .refine((v) => !v.thirdPartyEnabled || v.thirdPartyProvider, {
    path: ['thirdPartyProvider'],
    message: 'Enter the provider URL to turn this on',
  });
type FormValues = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

const toForm = (s: AdminSettings): FormValues => ({
  internalWeight: s.fraud?.internalWeight ?? 0.5,
  externalWeight: s.fraud?.externalWeight ?? 0.5,
  thirdPartyEnabled: s.fraud?.thirdPartyEnabled ?? false,
  thirdPartyProvider: s.fraud?.thirdPartyProvider ?? '',
  thirdPartyApiKey: s.fraud?.thirdPartyApiKey ?? '',
});

export function FraudSection({ settings, onDirtyChange }: SectionProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues, unknown, FormOutput>({ resolver: zodResolver(schema), defaultValues: toForm(settings) });
  const { save, isSaving } = useSettingsSection({ reset, settings, slice: [settings.fraud], toForm });

  const [internal, external, thirdPartyEnabled] = useWatch({
    control,
    name: ['internalWeight', 'externalWeight', 'thirdPartyEnabled'],
  });
  const total = Number(internal) + Number(external);
  const weightsOff = thirdPartyEnabled && Number.isFinite(total) && Math.abs(total - 1) > 0.001;

  return (
    <SectionShell
      sectionKey="fraud"
      title="Fraud scoring"
      description="Every order is scored from the customer's history with you. Optionally blend in a third-party risk check."
      isDirty={isDirty}
      isSaving={isSaving}
      onDirtyChange={onDirtyChange}
      onDiscard={() => reset(toForm(settings))}
      onSubmit={handleSubmit((values) => save({ fraud: values }))}
    >
      <div className="rounded-lg bg-slate-200 px-4 py-3 text-xs text-slate-500">
        Scores run from 0 to 100: <strong className="text-slate-700">30+</strong> is flagged medium risk and{' '}
        <strong className="text-slate-700">60+</strong> high risk on the order.
      </div>

      <SubSection
        title="Third-party risk check"
        description="Posts the customer's phone number to your provider and expects { &quot;riskScore&quot;: 0–100 } back."
      >
        <SwitchField
          control={control}
          name="thirdPartyEnabled"
          label="Use a third-party fraud provider"
          description="If the provider is down or answers in another shape, the order is scored on internal history alone."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Provider endpoint URL" error={errors.thirdPartyProvider?.message}>
            <Input {...register('thirdPartyProvider')} placeholder="https://api.provider.com/v1/risk" />
          </FormField>
          <SecretField
            control={control}
            name="thirdPartyApiKey"
            label="API key"
            savedValue={settings.fraud?.thirdPartyApiKey ?? ''}
            hint="Sent as a Bearer token"
          />
        </div>
      </SubSection>

      <SubSection
        title="Score weighting"
        description="Final score = internal weight × internal score + provider weight × provider score. Only applies when the provider answers."
      >
        <div className="grid max-w-md gap-4 sm:grid-cols-2">
          <FormField label="Internal weight" error={errors.internalWeight?.message}>
            <Input type="number" min={0} max={1} step="0.05" {...register('internalWeight')} />
          </FormField>
          <FormField label="Provider weight" error={errors.externalWeight?.message}>
            <Input type="number" min={0} max={1} step="0.05" {...register('externalWeight')} />
          </FormField>
        </div>
        {weightsOff && (
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
            The two weights add up to {Math.round(total * 100) / 100}, not 1 — scores will come out
            {total > 1 ? ' inflated' : ' deflated'} when the provider answers.
          </p>
        )}
      </SubSection>
    </SectionShell>
  );
}
