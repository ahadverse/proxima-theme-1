import { useEffect, useState } from 'react';
import type { FieldValues, Path, PathValue, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { toSlug } from '@/lib/slug';

interface AutoSlugOptions<T extends FieldValues> {
  watch: UseFormWatch<T>;
  setValue: UseFormSetValue<T>;
  register: UseFormRegister<T>;
  /** The field the address is made from ("name", "title"). */
  from: Path<T>;
  /** The address field. Defaults to "slug". */
  to?: Path<T>;
  /** An existing record keeps its address: changing it would break the links that already point at it. */
  isEdit: boolean;
  /** Changes when the form is reopened or pointed at another record, so a new one starts out following its name again. */
  resetKey: unknown;
}

/**
 * Fills a new record's address ("slug") in from its name as it is typed, so it is there to see before saving — until
 * someone types an address of their own. Clearing the address hands it back to the name. Returns the props for the
 * address <Input>.
 */
export function useAutoSlug<T extends FieldValues>({ watch, setValue, register, from, to, isEdit, resetKey }: AutoSlugOptions<T>) {
  const target = (to ?? ('slug' as Path<T>)) as Path<T>;
  const [typedByHand, setTypedByHand] = useState(false);
  const source = watch(from) as string | undefined;

  useEffect(() => {
    setTypedByHand(false);
  }, [resetKey]);

  useEffect(() => {
    if (isEdit || typedByHand) return;
    setValue(target, toSlug(source ?? '') as PathValue<T, Path<T>>);
  }, [isEdit, typedByHand, source, setValue, target]);

  return register(target, { onChange: (event) => setTypedByHand(String(event.target.value).trim() !== '') });
}
