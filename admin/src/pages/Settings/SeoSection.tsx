import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import type { AdminSettings } from '@/types/settings';
import { SectionShell } from './parts';
import { useSettingsSection, type SectionProps } from './useSettingsSection';

const schema = z.object({
  metaTitle: z.string().trim().max(120, 'Keep it under 120 characters'),
  metaDescription: z.string().trim().max(320, 'Keep it under 320 characters'),
});
type FormValues = z.infer<typeof schema>;

const toForm = (s: AdminSettings): FormValues => ({
  metaTitle: s.seo?.metaTitle ?? '',
  metaDescription: s.seo?.metaDescription ?? '',
});

export function SeoSection({ settings, onDirtyChange }: SectionProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(settings) });
  const { save, isSaving } = useSettingsSection({ reset, settings, slice: [settings.seo], toForm });

  const title = watch('metaTitle');
  const description = watch('metaDescription');

  return (
    <SectionShell
      sectionKey="seo"
      title="SEO"
      description="The title and description search engines show for your storefront's home page, and for any page without its own. Products and blog posts have their own SEO fields in their editors."
      isDirty={isDirty}
      isSaving={isSaving}
      onDirtyChange={onDirtyChange}
      onDiscard={() => reset(toForm(settings))}
      onSubmit={handleSubmit((values) => save({ seo: values }))}
    >
      <div className="max-w-2xl space-y-4">
        <FormField
          label="Meta title"
          error={errors.metaTitle?.message}
          hint={`${title.length} characters — around 50–60 reads best in search results`}
        >
          <Input {...register('metaTitle')} placeholder="Maroon — Premium Electronics & Gadgets" />
        </FormField>
        <FormField
          label="Meta description"
          error={errors.metaDescription?.message}
          hint={`${description.length} characters — around 150–160 reads best in search results`}
        >
          <Textarea rows={3} {...register('metaDescription')} />
        </FormField>
      </div>
    </SectionShell>
  );
}
