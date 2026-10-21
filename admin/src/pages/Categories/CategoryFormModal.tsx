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
import { useCreateCategory, useUpdateCategory } from '@/api/categories';
import type { Category } from '@/types/category';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  parent: z.string().nullable().optional(),
  image: z.string().optional(),
  icon: z.string().optional(),
  isFeatured: z.boolean().optional(),
  status: z.enum(['active', 'inactive']),
});
type FormValues = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

const emptyValues: FormValues = {
  name: '',
  slug: '',
  parent: null,
  image: '',
  icon: '',
  isFeatured: false,
  status: 'active',
};

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  categories: Category[];
}

function getDescendantIds(id: string, categories: Category[]): string[] {
  const children = categories.filter((c) => c.parent === id);
  return children.flatMap((c) => [c._id, ...getDescendantIds(c._id, categories)]);
}

export function CategoryFormModal({
  isOpen,
  onClose,
  category,
  categories,
}: CategoryFormModalProps) {
  const isEdit = Boolean(category);
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues, unknown, FormOutput>({ resolver: zodResolver(schema), defaultValues: emptyValues });
  const slugField = useAutoSlug({ watch, setValue, register, from: 'name', isEdit, resetKey: `${isOpen}-${category?._id ?? 'new'}` });

  useEffect(() => {
    if (!isOpen) return;
    reset(
      category
        ? {
            name: category.name,
            slug: category.slug,
            parent: category.parent,
            image: category.image ?? '',
            icon: category.icon ?? '',
            isFeatured: category.isFeatured,
            status: category.status,
          }
        : emptyValues
    );
  }, [isOpen, category, reset]);

  // A category can't become its own parent, or its own descendant's parent (would create a loop).
  const excludedIds = category ? [category._id, ...getDescendantIds(category._id, categories)] : [];
  const parentOptions = categories.filter((c) => !excludedIds.includes(c._id));

  function onSubmit(values: FormOutput) {
    const input = { ...values, parent: values.parent || null };
    const action =
      isEdit && category
        ? updateMutation.mutateAsync({ id: category._id, input })
        : createMutation.mutateAsync(input);

    toast.promise(action, {
      loading: isEdit ? 'Saving changes…' : 'Creating category…',
      success: () => {
        onClose();
        return isEdit ? 'Category updated' : 'Category created';
      },
      error: (err) => apiErrorMessage(err, 'Could not save category'),
    });
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Category' : 'Add Category'}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="category-form" isLoading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create category'}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Name" error={errors.name?.message}>
          <Input {...register('name')} placeholder="e.g. Smartphones" />
        </FormField>
        <FormField label="Slug" hint={isEdit ? 'Changing this changes its web address — links that point at the old one stop working.' : 'Made from the name as you type. Type your own to change it; clear it to go back to automatic.'}>
          <Input {...slugField} placeholder="smartphones" />
        </FormField>
        <FormField label="Parent category">
          <Controller
            control={control}
            name="parent"
            render={({ field }) => (
              <Select
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value || null)}
              >
                <option value="">— Top level —</option>
                {parentOptions.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          />
        </FormField>
        <FormField label="Image">
          <Controller
            control={control}
            name="image"
            render={({ field }) => (
              <SingleImageUpload value={field.value} onChange={field.onChange} />
            )}
          />
        </FormField>
        <FormField label="Icon" hint="Optional icon identifier used by the storefront nav">
          <Input {...register('icon')} />
        </FormField>
        <div className="flex h-10 items-center">
          <Checkbox label="Featured" {...register('isFeatured')} />
        </div>
        <p className="text-xs text-slate-400">
          Where it sits in the menu is set by dragging, on the Categories page. A new category goes to the end.
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
