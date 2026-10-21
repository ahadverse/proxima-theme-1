import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormField } from '@/components/ui/FormField';
import { SingleImageUpload } from '@/components/ui/SingleImageUpload';
import { apiErrorMessage } from '@/lib/api';
import { useAutoSlug } from '@/lib/useAutoSlug';
import { useCreateBrand, useUpdateBrand } from '@/api/brands';
import type { Brand } from '@/types/brand';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  logo: z.string().optional(),
  isFeatured: z.boolean().optional(),
  status: z.enum(['active', 'inactive']),
});
type FormValues = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

const emptyValues: FormValues = { name: '', slug: '', logo: '', isFeatured: false, status: 'active' };

interface BrandFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand: Brand | null;
}

export function BrandFormModal({ isOpen, onClose, brand }: BrandFormModalProps) {
  const isEdit = Boolean(brand);
  const createMutation = useCreateBrand();
  const updateMutation = useUpdateBrand();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues, unknown, FormOutput>({ resolver: zodResolver(schema), defaultValues: emptyValues });
  const slugField = useAutoSlug({ watch, setValue, register, from: 'name', isEdit, resetKey: `${isOpen}-${brand?._id ?? 'new'}` });

  useEffect(() => {
    if (!isOpen) return;
    reset(
      brand
        ? {
            name: brand.name,
            slug: brand.slug,
            logo: brand.logo ?? '',
            isFeatured: brand.isFeatured,
            status: brand.status,
          }
        : emptyValues
    );
  }, [isOpen, brand, reset]);

  function onSubmit(values: FormOutput) {
    const action =
      isEdit && brand
        ? updateMutation.mutateAsync({ id: brand._id, input: values })
        : createMutation.mutateAsync(values);

    toast.promise(action, {
      loading: isEdit ? 'Saving changes…' : 'Creating brand…',
      success: () => {
        onClose();
        return isEdit ? 'Brand updated' : 'Brand created';
      },
      error: (err) => apiErrorMessage(err, 'Could not save brand'),
    });
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Brand' : 'Add Brand'}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="brand-form" isLoading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create brand'}
          </Button>
        </>
      }
    >
      <form id="brand-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Name" error={errors.name?.message}>
          <Input {...register('name')} placeholder="e.g. Samsung" />
        </FormField>
        <FormField label="Slug" hint={isEdit ? 'Changing this changes its web address — links that point at the old one stop working.' : 'Made from the name as you type. Type your own to change it; clear it to go back to automatic.'}>
          <Input {...slugField} placeholder="samsung" />
        </FormField>
        <FormField label="Logo">
          <Controller
            control={control}
            name="logo"
            render={({ field }) => <SingleImageUpload value={field.value} onChange={field.onChange} />}
          />
        </FormField>
        <div className="flex h-10 items-center">
          <Checkbox label="Featured" {...register('isFeatured')} />
        </div>
        <p className="text-xs text-slate-400">
          Where it sits on the homepage is set by dragging, on the Brands page. A new brand goes to the end.
        </p>
        <FormField label="Status">
          <Select {...register('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </FormField>
      </form>
    </Modal>
  );
}
