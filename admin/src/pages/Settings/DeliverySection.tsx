import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import type { AdminSettings } from '@/types/settings';
import { SectionShell } from './parts';
import { useSettingsSection, type SectionProps } from './useSettingsSection';

const charge = z.coerce.number({ error: 'Enter an amount' }).min(0, 'Must be 0 or more');
const schema = z.object({ insideDhaka: charge, outsideDhaka: charge });
type FormValues = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

const toForm = (s: AdminSettings): FormValues => ({
  insideDhaka: s.deliveryCharges?.insideDhaka ?? 0,
  outsideDhaka: s.deliveryCharges?.outsideDhaka ?? 0,
});

export function DeliverySection({ settings, onDirtyChange }: SectionProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues, unknown, FormOutput>({ resolver: zodResolver(schema), defaultValues: toForm(settings) });
  const { save, isSaving } = useSettingsSection({ reset, settings, slice: [settings.deliveryCharges], toForm });

  return (
    <SectionShell
      sectionKey="delivery"
      title="Delivery charges"
      description="The flat shipping fee added at checkout, depending on where the order is going."
      isDirty={isDirty}
      isSaving={isSaving}
      onDirtyChange={onDirtyChange}
      onDiscard={() => reset(toForm(settings))}
      onSubmit={handleSubmit((values) => save({ deliveryCharges: values }))}
    >
      <div className="grid max-w-md gap-4 sm:grid-cols-2">
        <FormField label="Inside Dhaka (৳)" error={errors.insideDhaka?.message}>
          <Input type="number" min={0} step="1" {...register('insideDhaka')} />
        </FormField>
        <FormField label="Outside Dhaka (৳)" error={errors.outsideDhaka?.message}>
          <Input type="number" min={0} step="1" {...register('outsideDhaka')} />
        </FormField>
      </div>
    </SectionShell>
  );
}
