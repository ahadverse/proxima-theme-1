import type { ProductVariant } from '@/types/catalog';

/** What a shopper has picked, by attribute name — e.g. `{ Color: 'Red', Storage: '256GB' }`. */
export type VariantSelection = Record<string, string>;

/**
 * The values the variants offer for each attribute, in the order they first appear:
 * `[['Color', ['Black', 'Red']], ['Storage', ['128GB', '256GB']]]`.
 */
export function groupVariantAttributes(variants: ProductVariant[]): [string, string[]][] {
  const groups = new Map<string, string[]>();
  for (const variant of variants) {
    for (const attr of variant.attributes) {
      const values = groups.get(attr.attributeName) ?? [];
      if (!values.includes(attr.value)) values.push(attr.value);
      groups.set(attr.attributeName, values);
    }
  }
  return [...groups.entries()];
}

/** The attribute values a variant has. */
export function selectionOf(variant: ProductVariant | undefined): VariantSelection {
  const chosen: VariantSelection = {};
  variant?.attributes.forEach((a) => {
    chosen[a.attributeName] = a.value;
  });
  return chosen;
}

/**
 * The variant you land on by picking `value` for one attribute. The other choices stay where that
 * combination exists (Red + 256GB after being on Black + 256GB); where it doesn't, the variant that
 * keeps the most of them wins. Null only if no variant has that value at all.
 */
export function variantForChoice(
  variants: ProductVariant[],
  selection: VariantSelection,
  attrName: string,
  value: string
): ProductVariant | null {
  const wanted = { ...selection, [attrName]: value };
  let best: { variant: ProductVariant; score: number } | null = null;
  for (const variant of variants) {
    if (!variant.attributes.some((a) => a.attributeName === attrName && a.value === value)) continue;
    const score = variant.attributes.filter((a) => wanted[a.attributeName] === a.value).length;
    if (!best || score > best.score) best = { variant, score };
  }
  return best?.variant ?? null;
}
