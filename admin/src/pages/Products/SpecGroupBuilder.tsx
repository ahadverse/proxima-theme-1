import { type Control, type UseFormRegister, useFieldArray } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { ProductFormValues } from './productFormSchema';

interface SpecGroupBuilderProps {
  control: Control<ProductFormValues>;
  register: UseFormRegister<ProductFormValues>;
}

export function SpecGroupBuilder({ control, register }: SpecGroupBuilderProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'specifications' });

  return (
    <div className="space-y-4">
      {fields.map((group, groupIndex) => (
        <div key={group.id} className="rounded-lg border border-slate-200 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Input aria-label={`Group ${groupIndex + 1} name`}
              {...register(`specifications.${groupIndex}.groupName`)}
              placeholder="Group name, e.g. Display"
              className="max-w-xs font-medium"
            />
            <button
              type="button"
              onClick={() => remove(groupIndex)}
              aria-label={`Remove group ${groupIndex + 1}`}
              className="ml-auto shrink-0 text-slate-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <SpecGroupItems control={control} register={register} groupIndex={groupIndex} />
        </div>
      ))}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => append({ groupName: '', items: [{ label: '', value: '' }] })}
      >
        <Plus className="h-3.5 w-3.5" /> Add spec group
      </Button>
    </div>
  );
}

function SpecGroupItems({
  control,
  register,
  groupIndex,
}: {
  control: Control<ProductFormValues>;
  register: UseFormRegister<ProductFormValues>;
  groupIndex: number;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `specifications.${groupIndex}.items`,
  });

  return (
    <div className="space-y-2">
      {fields.map((item, itemIndex) => (
        <div key={item.id} className="flex items-center gap-2">
          <Input aria-label={`Group ${groupIndex + 1} item ${itemIndex + 1} label`}
            {...register(`specifications.${groupIndex}.items.${itemIndex}.label`)}
            placeholder="Label, e.g. Screen size"
            className="max-w-[160px]"
          />
          <Input aria-label={`Group ${groupIndex + 1} item ${itemIndex + 1} value`}
            {...register(`specifications.${groupIndex}.items.${itemIndex}.value`)}
            placeholder="Value, e.g. 6.7 inch"
          />
          <button
            type="button"
            onClick={() => remove(itemIndex)}
            aria-label={`Remove group ${groupIndex + 1} item ${itemIndex + 1}`}
            className="shrink-0 text-slate-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={() => append({ label: '', value: '' })}>
        <Plus className="h-3.5 w-3.5" /> Add row
      </Button>
    </div>
  );
}
