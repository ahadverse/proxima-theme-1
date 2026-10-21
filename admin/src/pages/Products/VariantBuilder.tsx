import { type Control, Controller, type UseFormRegister, useFieldArray, useWatch } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { ImageUpload } from '@/components/ui/ImageUpload';
import type { Attribute } from '@/types/attribute';
import type { ProductFormValues } from './productFormSchema';

interface VariantBuilderProps {
  control: Control<ProductFormValues>;
  register: UseFormRegister<ProductFormValues>;
  attributes: Attribute[];
  /** SKUs that already exist on the saved product: their stock moves only through the Inventory page, so it is read-only here. */
  lockedStockSkus?: ReadonlySet<string>;
}

function cartesianProduct(
  groups: { attributeId: string; values: string[] }[]
): { attribute: string; value: string }[][] {
  return groups.reduce<{ attribute: string; value: string }[][]>(
    (acc, group) =>
      acc.flatMap((combo) => group.values.map((value) => [...combo, { attribute: group.attributeId, value }])),
    [[]]
  );
}

export function VariantBuilder({ control, register, attributes, lockedStockSkus }: VariantBuilderProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'variants' });
  const attributesUsed = useWatch({ control, name: 'attributesUsed' }) ?? [];
  const basePrice = useWatch({ control, name: 'basePrice' }) ?? 0;
  const title = useWatch({ control, name: 'title' }) ?? '';

  const selectedAttributes = attributes.filter((a) => attributesUsed.includes(a._id));

  function generateVariants() {
    if (selectedAttributes.length === 0) return;
    const combos = cartesianProduct(
      selectedAttributes.map((a) => ({ attributeId: a._id, values: a.values.map((v) => v.value) }))
    );
    const existingKeys = new Set(
      fields.map((f) =>
        f.attributes
          .map((a) => `${a.attribute}:${a.value}`)
          .sort()
          .join('|')
      )
    );
    const titlePrefix = title.replace(/\s+/g, '').toUpperCase().slice(0, 6) || 'SKU';
    for (const combo of combos) {
      const key = combo
        .map((a) => `${a.attribute}:${a.value}`)
        .sort()
        .join('|');
      if (existingKeys.has(key)) continue;
      const suffix = combo.map((a) => a.value.replace(/\s+/g, '').toUpperCase().slice(0, 4)).join('-');
      append({
        sku: `${titlePrefix}-${suffix}`,
        attributes: combo,
        price: basePrice,
        compareAtPrice: undefined,
        stock: 0,
        lowStockThreshold: 5,
        images: [],
      });
    }
  }

  function valueLabel(attributeId: string, value: string) {
    const attr = attributes.find((a) => a._id === attributeId);
    return attr ? `${attr.name}: ${value}` : value;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {selectedAttributes.length === 0
            ? 'Pick at least one attribute above to generate variant combinations.'
            : `${selectedAttributes.length} attribute${selectedAttributes.length > 1 ? 's' : ''} selected — generating adds any new combinations without touching existing variants.`}
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={generateVariants}
          disabled={selectedAttributes.length === 0}
        >
          <Plus className="h-3.5 w-3.5" /> Generate variants
        </Button>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-lg border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                {field.attributes.map((a, i) => (
                  <span key={i} className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                    {valueLabel(a.attribute, a.value)}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Remove variant ${index + 1}`}
                className="text-slate-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <FormField label="SKU">
                <Input {...register(`variants.${index}.sku`)} />
              </FormField>
              <FormField label="Price">
                <Input type="number" step="0.01" {...register(`variants.${index}.price`)} />
              </FormField>
              <FormField label="Compare-at price">
                <Input type="number" step="0.01" {...register(`variants.${index}.compareAtPrice`)} />
              </FormField>
              <FormField
                label="Stock"
                hint={lockedStockSkus?.has(field.sku) ? 'Adjust on the Inventory page' : undefined}
              >
                <Input
                  type="number"
                  min={0}
                  readOnly={lockedStockSkus?.has(field.sku)}
                  {...register(`variants.${index}.stock`)}
                />
              </FormField>
            </div>
            <div className="mt-3">
              <FormField label="Variant images">
                <Controller
                  control={control}
                  name={`variants.${index}.images`}
                  render={({ field: imgField }) => (
                    <ImageUpload images={imgField.value ?? []} onChange={imgField.onChange} max={4} />
                  )}
                />
              </FormField>
            </div>
          </div>
        ))}
      </div>

      {fields.length === 0 && selectedAttributes.length > 0 && (
        <p className="text-xs text-slate-400">
          No variants yet — click &ldquo;Generate variants&rdquo; to create the combinations.
        </p>
      )}
    </div>
  );
}
