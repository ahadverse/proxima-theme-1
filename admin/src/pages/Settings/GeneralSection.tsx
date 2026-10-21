import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { SingleImageUpload } from '@/components/ui/SingleImageUpload';
import { Textarea } from '@/components/ui/Textarea';
import type { AdminSettings } from '@/types/settings';
import { SectionShell, SubSection } from './parts';
import { useSettingsSection, type SectionProps } from './useSettingsSection';

const optionalUrl = z
  .string()
  .trim()
  .refine((v) => !v || /^https?:\/\/\S+$/i.test(v), 'Enter the full link, starting with https://');

const schema = z.object({
  storeName: z.string().trim().min(1, 'Store name is required'),
  logo: z.string(),
  hotlinePhone: z.string().trim(),
  supportEmail: z
    .string()
    .trim()
    .refine((v) => !v || z.email().safeParse(v).success, 'Enter a valid email address'),
  socialLinks: z.object({
    facebook: optionalUrl,
    instagram: optionalUrl,
    whatsappNumber: z
      .string()
      .trim()
      .refine((v) => !v || /^\d{8,15}$/.test(v.replace(/\D/g, '')), 'Enter the number with its country code'),
    messengerUsername: z
      .string()
      .trim()
      .refine((v) => !v || /^[\w.-]+$/.test(v), 'Only the page username, not the full link'),
  }),
  storeLocations: z.array(
    z.object({
      label: z.string().trim().min(1, 'Give this location a name'),
      address: z.string().trim().min(1, 'Address is required'),
      phone: z.string().trim(),
    })
  ),
});
type FormValues = z.infer<typeof schema>;

const toForm = (s: AdminSettings): FormValues => ({
  storeName: s.storeName ?? '',
  logo: s.logo ?? '',
  hotlinePhone: s.hotlinePhone ?? '',
  supportEmail: s.supportEmail ?? '',
  socialLinks: {
    facebook: s.socialLinks?.facebook ?? '',
    instagram: s.socialLinks?.instagram ?? '',
    whatsappNumber: s.socialLinks?.whatsappNumber ?? '',
    messengerUsername: s.socialLinks?.messengerUsername ?? '',
  },
  storeLocations: (s.storeLocations ?? []).map((l) => ({
    label: l.label ?? '',
    address: l.address ?? '',
    phone: l.phone ?? '',
  })),
});

export function GeneralSection({ settings, onDirtyChange }: SectionProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(settings) });
  const { fields, append, remove } = useFieldArray({ control, name: 'storeLocations' });

  // Everything this form edits, so a change to any of it elsewhere refreshes the form.
  const { save, isSaving } = useSettingsSection({
    reset,
    settings,
    slice: [
      settings.storeName,
      settings.logo,
      settings.hotlinePhone,
      settings.supportEmail,
      settings.socialLinks,
      settings.storeLocations,
    ],
    toForm,
  });

  return (
    <SectionShell
      sectionKey="general"
      title="General"
      description="How your store presents itself on the storefront — name, contact details and locations."
      isDirty={isDirty}
      isSaving={isSaving}
      onDirtyChange={onDirtyChange}
      onDiscard={() => reset(toForm(settings))}
      onSubmit={handleSubmit((values) => save(values))}
    >
      <SubSection title="Store identity">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Store name" error={errors.storeName?.message}>
            <Input {...register('storeName')} placeholder="Maroon" />
          </FormField>
          <FormField label="Support email" error={errors.supportEmail?.message}>
            <Input type="email" {...register('supportEmail')} placeholder="support@yourstore.com" />
          </FormField>
          <FormField label="Hotline phone" error={errors.hotlinePhone?.message} hint="Shown in the storefront header and footer">
            <Input {...register('hotlinePhone')} placeholder="09638 000 888" />
          </FormField>
        </div>
        <FormField label="Logo">
          <Controller
            control={control}
            name="logo"
            render={({ field }) => <SingleImageUpload value={field.value} onChange={field.onChange} />}
          />
        </FormField>
      </SubSection>

      <SubSection title="Social & chat links" description="Leave a field blank to hide that link on the storefront.">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Facebook page" error={errors.socialLinks?.facebook?.message}>
            <Input {...register('socialLinks.facebook')} placeholder="https://facebook.com/yourpage" />
          </FormField>
          <FormField label="Instagram" error={errors.socialLinks?.instagram?.message}>
            <Input {...register('socialLinks.instagram')} placeholder="https://instagram.com/yourhandle" />
          </FormField>
          <FormField
            label="WhatsApp number"
            error={errors.socialLinks?.whatsappNumber?.message}
            hint="With country code, e.g. 8801700000000"
          >
            <Input {...register('socialLinks.whatsappNumber')} placeholder="8801700000000" />
          </FormField>
          <FormField
            label="Messenger username"
            error={errors.socialLinks?.messengerUsername?.message}
            hint="The part after m.me/ in your page's Messenger link"
          >
            <Input {...register('socialLinks.messengerUsername')} placeholder="yourpage" />
          </FormField>
        </div>
      </SubSection>

      <SubSection title="Store locations" description="Listed on the storefront's Store Locations page.">
        {fields.length === 0 && <p className="text-sm text-slate-400">No locations added yet.</p>}
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="rounded-lg border border-slate-200 p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Name" error={errors.storeLocations?.[index]?.label?.message}>
                  <Input {...register(`storeLocations.${index}.label`)} placeholder="Dhaka — Bashundhara" />
                </FormField>
                <FormField label="Phone" error={errors.storeLocations?.[index]?.phone?.message}>
                  <Input {...register(`storeLocations.${index}.phone`)} />
                </FormField>
              </div>
              <div className="mt-3 flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <FormField label="Address" error={errors.storeLocations?.[index]?.address?.message}>
                    <Textarea rows={2} {...register(`storeLocations.${index}.address`)} />
                  </FormField>
                </div>
                <IconButton tone="red" title="Remove location" className="mt-6" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => append({ label: '', address: '', phone: '' })}
        >
          <Plus className="h-4 w-4" /> Add location
        </Button>
      </SubSection>
    </SectionShell>
  );
}
