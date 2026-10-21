import type { ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle } from 'lucide-react';
import { z } from 'zod';
import { Badge } from '@/components/ui/Badge';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Select';
import type { AdminSettings, CourierProviderKey } from '@/types/settings';
import { SecretField, SectionShell } from './parts';
import { useSettingsSection, type SectionProps } from './useSettingsSection';

const mode = z.enum(['sandbox', 'live']);
const text = z.string().trim();
const weight = z
  .number({ error: 'Enter a weight between 0.5 and 10 kg' })
  .min(0.5, 'Between 0.5 and 10 kg')
  .max(10, 'Between 0.5 and 10 kg');

const schema = z.object({
  provider: z.enum(['', 'steadfast', 'pathao', 'carrybee']),
  steadfast: z.object({ apiKey: text, secretKey: text }),
  pathao: z.object({
    mode,
    clientId: text,
    clientSecret: text,
    username: text,
    password: text,
    storeId: text.regex(/^\d*$/, 'The store ID is a number, like 12345'),
    defaultWeight: weight,
  }),
  carrybee: z.object({
    mode,
    clientId: text,
    clientSecret: text,
    clientContext: text,
    storeId: text,
    defaultWeight: weight,
  }),
});
type FormValues = z.infer<typeof schema>;

const toForm = (s: AdminSettings): FormValues => {
  const c = s.courier;
  // Which courier is in use: the chosen one, if it is also switched on (older settings only had Steadfast's switch).
  const chosen = c?.defaultProvider ?? 'steadfast';
  const provider = chosen && c?.[chosen]?.enabled ? chosen : '';
  return {
    provider,
    steadfast: { apiKey: c?.steadfast?.apiKey ?? '', secretKey: c?.steadfast?.secretKey ?? '' },
    pathao: {
      mode: c?.pathao?.mode ?? 'sandbox',
      clientId: c?.pathao?.clientId ?? '',
      clientSecret: c?.pathao?.clientSecret ?? '',
      username: c?.pathao?.username ?? '',
      password: c?.pathao?.password ?? '',
      storeId: c?.pathao?.storeId ?? '',
      defaultWeight: c?.pathao?.defaultWeight ?? 0.5,
    },
    carrybee: {
      mode: c?.carrybee?.mode ?? 'sandbox',
      clientId: c?.carrybee?.clientId ?? '',
      clientSecret: c?.carrybee?.clientSecret ?? '',
      clientContext: c?.carrybee?.clientContext ?? '',
      storeId: c?.carrybee?.storeId ?? '',
      defaultWeight: c?.carrybee?.defaultWeight ?? 0.5,
    },
  };
};

/** The API's shape: one default courier, and each courier's own switch kept in step with it. */
const toPatch = (v: FormValues) => ({
  courier: {
    defaultProvider: v.provider,
    steadfast: { enabled: v.provider === 'steadfast', ...v.steadfast },
    pathao: { enabled: v.provider === 'pathao', ...v.pathao },
    carrybee: { enabled: v.provider === 'carrybee', ...v.carrybee },
  },
});

function ProviderCard({
  title,
  description,
  selected,
  complete,
  children,
}: {
  title: string;
  description: string;
  selected: boolean;
  complete: boolean;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {selected && complete && <Badge tone="green">Booking new orders</Badge>}
        {selected && !complete && <Badge tone="amber">Credentials incomplete — nothing will be booked</Badge>}
        {!selected && <Badge tone="slate">Not selected</Badge>}
      </div>
      <p className="mt-0.5 text-xs text-slate-400">{description}</p>
      <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">{children}</div>
    </div>
  );
}

const ModeOptions = () => (
  <>
    <option value="sandbox">Sandbox (testing — no real parcels)</option>
    <option value="live">Live (real parcels)</option>
  </>
);

const OPTIONS: { value: '' | CourierProviderKey; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'steadfast', label: 'Steadfast' },
  { value: 'pathao', label: 'Pathao' },
  { value: 'carrybee', label: 'Carrybee' },
];

export function CourierSection({ settings, onDirtyChange }: SectionProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(settings) });
  const { save, isSaving } = useSettingsSection({ reset, settings, slice: [settings.courier], toForm });

  const values = useWatch({ control });
  const provider = values.provider ?? '';
  const saved = settings.courier;

  const complete: Record<CourierProviderKey, boolean> = {
    steadfast: Boolean(values.steadfast?.apiKey && values.steadfast?.secretKey),
    pathao: Boolean(
      values.pathao?.clientId &&
        values.pathao?.clientSecret &&
        values.pathao?.username &&
        values.pathao?.password &&
        values.pathao?.storeId
    ),
    carrybee: Boolean(
      values.carrybee?.clientId && values.carrybee?.clientSecret && values.carrybee?.clientContext && values.carrybee?.storeId
    ),
  };

  return (
    <SectionShell
      sectionKey="courier"
      title="Courier"
      description="When an order moves to Processing it is booked with the courier chosen here, and the consignment is attached to the order."
      isDirty={isDirty}
      isSaving={isSaving}
      onDirtyChange={onDirtyChange}
      onDiscard={() => reset(toForm(settings))}
      onSubmit={handleSubmit((v) => save(toPatch(v)))}
    >
      <div className="max-w-2xl space-y-6">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Book new orders with</p>
          <Segmented
            label="Courier for new orders"
            value={provider}
            onChange={(next) => setValue('provider', next, { shouldDirty: true })}
            options={OPTIONS}
          />
          <p className="mt-2 text-xs text-slate-400">
            {provider === ''
              ? 'None: orders are not sent anywhere — you book each parcel in the courier’s own dashboard.'
              : 'Only this courier is used. Credentials below are kept for the others so switching back is one click.'}
          </p>
        </div>

        <ProviderCard
          title="Steadfast"
          description="Booked through Steadfast’s merchant API. Both keys are in your Steadfast merchant panel under API settings."
          selected={provider === 'steadfast'}
          complete={complete.steadfast}
        >
          <SecretField control={control} name="steadfast.apiKey" label="API key" savedValue={saved?.steadfast?.apiKey ?? ''} />
          <SecretField control={control} name="steadfast.secretKey" label="Secret key" savedValue={saved?.steadfast?.secretKey ?? ''} />
        </ProviderCard>

        <ProviderCard
          title="Pathao"
          description="Booked through Pathao’s Merchant API. Pathao works out the city, zone and area from the delivery address."
          selected={provider === 'pathao'}
          complete={complete.pathao}
        >
          <FormField
            label="Mode"
            hint="Sandbox uses Pathao’s test server — Pathao publishes test credentials in its API docs. Live needs your own credentials from merchant.pathao.com → Developer API."
          >
            <Select {...register('pathao.mode')}>
              <ModeOptions />
            </Select>
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Client ID" error={errors.pathao?.clientId?.message}>
              <Input {...register('pathao.clientId')} spellCheck={false} autoComplete="off" />
            </FormField>
            <SecretField control={control} name="pathao.clientSecret" label="Client secret" savedValue={saved?.pathao?.clientSecret ?? ''} />
            <FormField label="Username" hint="The email you sign in to the Pathao merchant panel with" error={errors.pathao?.username?.message}>
              <Input {...register('pathao.username')} spellCheck={false} autoComplete="off" />
            </FormField>
            <SecretField control={control} name="pathao.password" label="Password" savedValue={saved?.pathao?.password ?? ''} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Store ID"
              hint="Pickup store: Pathao merchant panel → Stores. A new store is usable about an hour after Pathao approves it."
              error={errors.pathao?.storeId?.message}
            >
              <Input {...register('pathao.storeId')} inputMode="numeric" placeholder="12345" autoComplete="off" />
            </FormField>
            <FormField label="Parcel weight (kg)" hint="Used for every parcel — Pathao accepts 0.5 to 10" error={errors.pathao?.defaultWeight?.message}>
              <Input {...register('pathao.defaultWeight', { valueAsNumber: true })} type="number" step="0.1" min="0.5" max="10" />
            </FormField>
          </div>
        </ProviderCard>

        <ProviderCard
          title="Carrybee"
          description="Booked through Carrybee’s API v2. Carrybee gives these credentials to merchants — ask your Carrybee account manager."
          selected={provider === 'carrybee'}
          complete={complete.carrybee}
        >
          <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              Carrybee’s documentation is private to merchants, so this connection has not been run against a real Carrybee
              account yet. Book one test order and check it in the Carrybee dashboard before you rely on it.
            </span>
          </p>
          <FormField label="Mode">
            <Select {...register('carrybee.mode')}>
              <ModeOptions />
            </Select>
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Client ID" error={errors.carrybee?.clientId?.message}>
              <Input {...register('carrybee.clientId')} spellCheck={false} autoComplete="off" />
            </FormField>
            <SecretField control={control} name="carrybee.clientSecret" label="Client secret" savedValue={saved?.carrybee?.clientSecret ?? ''} />
            <SecretField control={control} name="carrybee.clientContext" label="Client context" savedValue={saved?.carrybee?.clientContext ?? ''} />
            <FormField label="Store ID" hint="Your Carrybee pickup store" error={errors.carrybee?.storeId?.message}>
              <Input {...register('carrybee.storeId')} autoComplete="off" />
            </FormField>
          </div>
          <FormField label="Parcel weight (kg)" hint="Used for every parcel" error={errors.carrybee?.defaultWeight?.message}>
            <Input {...register('carrybee.defaultWeight', { valueAsNumber: true })} type="number" step="0.1" min="0.5" max="10" />
          </FormField>
        </ProviderCard>
      </div>
    </SectionShell>
  );
}
