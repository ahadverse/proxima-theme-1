import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789', 6);

/** e.g. MRN-261016-482917 */
export function generateOrderNumber() {
  const now = new Date();
  const y = String(now.getFullYear()).slice(2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `MRN-${y}${m}${d}-${nanoid()}`;
}
