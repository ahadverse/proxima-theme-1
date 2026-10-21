import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';
import { apiErrorMessage } from '@/lib/api';
import { useAutoSlug } from '@/lib/useAutoSlug';
import { useCreateAttribute, useUpdateAttribute } from '@/api/attributes';
import type { Attribute } from '@/types/attribute';

const valueSchema = z.object({
  value: z.string().min(1, 'Required'),
  colorHex: z.string().optional(),
  sortOrder: z.coerce.number().optional(),
});
const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  type: z.enum(['color', 'text']),
  values: z.array(valueSchema),
});
type FormValues = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

const emptyValues: FormValues = { name: '', slug: '', type: 'text', values: [] };

interface AttributeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  attribute: Attribute | null;
}

export function AttributeFormModal({ isOpen, onClose, attribute }: AttributeFormModalProps) {
  const isEdit = Boolean(attribute);
  const createMutation = useCreateAttribute();
  const updateMutation = useUpdateAttribute();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues, unknown, FormOutput>({ resolver: zodResolver(schema), defaultValues: emptyValues });
  const slugField = useAutoSlug({ watch, setValue, register, from: 'name', isEdit, resetKey: `${isOpen}-${attribute?._id ?? 'new'}` });
  const { fields, append, remove } = useFieldArray({ control, name: 'values' });
  const type = watch('type');

  useEffect(() => {
    if (!isOpen) return;
    reset(
      attribute
        ? {
            name: attribute.name,
            slug: attribute.slug,
            type: attribute.type,
            values: attribute.values.map((v) => ({
              value: v.value,
              colorHex: v.colorHex ?? '',
              sortOrder: v.sortOrder ?? 0,
            })),
          }
        : emptyValues
    );
  }, [isOpen, attribute, reset]);

  function onSubmit(values: FormOutput) {
    const action =
      isEdit && attribute
        ? updateMutation.mutateAsync({ id: attribute._id, input: values })
        : createMutation.mutateAsync(values);

    toast.promise(action, {
      loading: isEdit ? 'Saving changes…' : 'Creating attribute…',
      success: () => {
        onClose();
        return isEdit ? 'Attribute updated' : 'Attribute created';
      },
      error: (err) => apiErrorMessage(err, 'Could not save attribute'),
    });
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Attribute' : 'Add Attribute'}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="attribute-form" isLoading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create attribute'}
          </Button>
        </>
      }
    >
      <form id="attribute-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Name" error={errors.name?.message}>
          <Input {...register('name')} placeholder="e.g. Color, Storage, RAM" />
        </FormField>
        <FormField label="Slug" hint={isEdit ? 'Changing this affects anything that uses the old one.' : 'Made from the name as you type. Type your own to change it; clear it to go back to automatic.'}>
          <Input {...slugField} placeholder="color" />
        </FormField>
        <FormField label="Type">
          <Select {...register('type')}>
            <option value="text">Text (e.g. Storage: 128GB, 256GB)</option>
            <option value="color">Color (shows a swatch picker)</option>
          </Select>
        </FormField>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Values</label>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => append({ value: '', colorHex: '#000000', sortOrder: fields.length })}
            >
              <Plus className="h-3.5 w-3.5" /> Add value
            </Button>
          </div>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                {type === 'color' && (
                  <input aria-label={`Color for value ${index + 1}`}
                    type="color"
                    {...register(`values.${index}.colorHex`)}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded border border-slate-200"
                  />
                )}
                <Input aria-label={`Value ${index + 1}`}
                  {...register(`values.${index}.value`)}
                  placeholder={type === 'color' ? 'e.g. Midnight Black' : 'e.g. 128GB'}
                  error={errors.values?.[index]?.value?.message}
                />
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="shrink-0 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {fields.length === 0 && (
              <p className="text-xs text-slate-400">No values yet — add at least one.</p>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
