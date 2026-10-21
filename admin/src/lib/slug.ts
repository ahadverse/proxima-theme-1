/** "Eid Offers 2026!" -> "eid-offers-2026". Non-Latin text (e.g. Bangla) is dropped, which can leave nothing. */
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}
