import type { ReactNode } from 'react';
import { useForm, useWatch, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle } from 'lucide-react';
import { z } from 'zod';
import { Badge } from '@/components/ui/Badge';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { AdminSettings } from '@/types/settings';
import { SecretField, SectionShell, SwitchControl } from './parts';
import { useSettingsSection, type SectionProps } from './useSettingsSection';

const mode = z.enum(['sandbox', 'live']);
const text = z.string().trim();

const schema = z.object({
  cod: z.object({ enabled: z.boolean() }),
  paystation: z.object({ enabled: z.boolean(), mode, merchantId: text, password: text, apiKey: text }),
  bkash: z.object({ enabled: z.boolean(), mode, appKey: text, appSecret: text, username: text, password: text }),
  nagad: z.object({ enabled: z.boolean(), mode, merchantId: text, merchantPrivateKey: text, pgPublicKey: text }),
});
type FormValues = z.infer<typeof schema>;

const toForm = (s: AdminSettings): FormValues => {
  const gw = s.paymentGateways;
  return {
    cod: { enabled: gw?.cod?.enabled ?? true },
    paystation: {
      enabled: gw?.paystation?.enabled ?? false,
      mode: gw?.paystation?.mode ?? 'sandbox',
      merchantId: gw?.paystation?.merchantId ?? '',
      password: gw?.paystation?.password ?? '',
      apiKey: gw?.paystation?.apiKey ?? '',
    },
    bkash: {
      enabled: gw?.bkash?.enabled ?? false,
      mode: gw?.bkash?.mode ?? 'sandbox',
      appKey: gw?.bkash?.appKey ?? '',
      appSecret: gw?.bkash?.appSecret ?? '',
      username: gw?.bkash?.username ?? '',
      password: gw?.bkash?.password ?? '',
    },
    nagad: {
      enabled: gw?.nagad?.enabled ?? false,
      mode: gw?.nagad?.mode ?? 'sandbox',
      merchantId: gw?.nagad?.merchantId ?? '',
      merchantPrivateKey: gw?.nagad?.merchantPrivateKey ?? '',
      pgPublicKey: gw?.nagad?.pgPublicKey ?? '',
    },
  };
};

type GatewayStatus = 'off' | 'incomplete' | 'active';

/** A gateway shows up at checkout only when it is switched on AND has every credential — same rule as the backend. */
function statusOf(enabled: boolean, isComplete: boolean): GatewayStatus {
  if (!enabled) return 'off';
  return isComplete ? 'active' : 'incomplete';
}

function StatusBadge({ status }: { status: GatewayStatus }) {
  if (status === 'active') return <Badge tone="green">Active at checkout</Badge>;
  if (status === 'incomplete') return <Badge tone="amber">Credentials incomplete — hidden at checkout</Badge>;
  return <Badge tone="slate">Off</Badge>;
}

function GatewayCard({
  title,
  description,
  status,
  toggle,
  children,
}: {
  title: string;
  description: string;
  status: GatewayStatus;
  toggle: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
            <StatusBadge status={status} />
          </div>
          <p className="mt-0.5 text-xs text-slate-400">{description}</p>
        </div>
        <div className="shrink-0">{toggle}</div>
      </div>
      {children && <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">{children}</div>}
    </div>
  );
}

function ModeField({
  register,
  error,
  hint = 'Live takes real payments',
}: {
  register: UseFormRegisterReturn;
  error?: string;
  hint?: string;
}) {
  return (
    <FormField label="Mode" error={error} hint={hint}>
      <Select {...register}>
        <option value="sandbox">Sandbox (testing)</option>
        <option value="live">Live (real payments)</option>
      </Select>
    </FormField>
  );
}

export function PaymentsSection({ settings, onDirtyChange }: SectionProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(settings) });
  const { save, isSaving } = useSettingsSection({ reset, settings, slice: [settings.paymentGateways], toForm });

  const values = useWatch({ control });
  const saved = settings.paymentGateways;

  const cod = values.cod?.enabled ?? true;
  const paystation = statusOf(
    Boolean(values.paystation?.enabled),
    Boolean(values.paystation?.merchantId && values.paystation?.password)
  );
  const bkash = statusOf(
    Boolean(values.bkash?.enabled),
    Boolean(values.bkash?.appKey && values.bkash?.appSecret && values.bkash?.username && values.bkash?.password)
  );
  const nagad = statusOf(
    Boolean(values.nagad?.enabled),
    Boolean(values.nagad?.merchantId && values.nagad?.merchantPrivateKey && values.nagad?.pgPublicKey)
  );
  const nothingAvailable = !cod && paystation !== 'active' && bkash !== 'active' && nagad !== 'active';

  return (
    <SectionShell
      sectionKey="payments"
      title="Payment methods"
      description="Choose how customers can pay. Gateway credentials are stored encrypted and are never shown again after saving."
      isDirty={isDirty}
      isSaving={isSaving}
      onDirtyChange={onDirtyChange}
      onDiscard={() => reset(toForm(settings))}
      onSubmit={handleSubmit((v) => save({ paymentGateways: v }))}
    >
      {nothingAvailable && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          No payment method would be available at checkout, so customers couldn't place orders.
        </div>
      )}

      <GatewayCard
        title="Cash on Delivery"
        description="Customers pay the courier when the order arrives."
        status={cod ? 'active' : 'off'}
        toggle={<SwitchControl control={control} name="cod.enabled" label="Cash on Delivery" />}
      />

      <GatewayCard
        title="PayStation"
        description="Cards, mobile wallets and internet banking through one hosted checkout."
        status={paystation}
        toggle={<SwitchControl control={control} name="paystation.enabled" label="PayStation" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <ModeField
            register={register('paystation.mode')}
            error={errors.paystation?.mode?.message}
            hint="Sandbox and Live have separate Merchant ID and password — they don't work on each other's side"
          />
          <FormField label="Merchant ID" error={errors.paystation?.merchantId?.message}>
            <Input {...register('paystation.merchantId')} />
          </FormField>
          <SecretField
            control={control}
            name="paystation.password"
            label="Password"
            savedValue={saved?.paystation?.password ?? ''}
          />
        </div>
      </GatewayCard>

      <GatewayCard
        title="bKash"
        description="bKash tokenized checkout."
        status={bkash}
        toggle={<SwitchControl control={control} name="bkash.enabled" label="bKash" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <ModeField register={register('bkash.mode')} error={errors.bkash?.mode?.message} />
          <FormField label="App key" error={errors.bkash?.appKey?.message}>
            <Input {...register('bkash.appKey')} />
          </FormField>
          <SecretField
            control={control}
            name="bkash.appSecret"
            label="App secret"
            savedValue={saved?.bkash?.appSecret ?? ''}
          />
          <FormField label="Username" error={errors.bkash?.username?.message}>
            <Input {...register('bkash.username')} autoComplete="off" />
          </FormField>
          <SecretField
            control={control}
            name="bkash.password"
            label="Password"
            savedValue={saved?.bkash?.password ?? ''}
          />
        </div>
      </GatewayCard>

      <GatewayCard
        title="Nagad"
        description="Nagad payment gateway."
        status={nagad}
        toggle={<SwitchControl control={control} name="nagad.enabled" label="Nagad" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <ModeField register={register('nagad.mode')} error={errors.nagad?.mode?.message} />
          <FormField label="Merchant ID" error={errors.nagad?.merchantId?.message}>
            <Input {...register('nagad.merchantId')} />
          </FormField>
        </div>
        <SecretField
          control={control}
          name="nagad.merchantPrivateKey"
          label="Merchant private key"
          savedValue={saved?.nagad?.merchantPrivateKey ?? ''}
          placeholder="Paste the private key"
          multiline
        />
        <SecretField
          control={control}
          name="nagad.pgPublicKey"
          label="Payment gateway public key"
          savedValue={saved?.nagad?.pgPublicKey ?? ''}
          placeholder="Paste the public key"
          multiline
        />
      </GatewayCard>
    </SectionShell>
  );
}
