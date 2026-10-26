// Copied from backend/src/utils/phone.js by scripts/demo/sync-backend.mjs — edit the original, then run that script.
/**
 * One canonical spelling of a phone number, so the same person is recognised however they type it —
 * at sign-in, at checkout, when tracking an order, and by the fraud checks that key on the number.
 * Separators go, and Bangladesh's country-code forms (+8801…, 8801…) become the local 01… form.
 * Numbers that aren't Bangladeshi are only tidied, never reinterpreted.
 */
export function normalizePhone(input) {
  const tidy = String(input).trim().replace(/[\s\-().]/g, '');
  const digits = tidy.replace(/^\+/, '');
  // 880 is Bangladesh's country code; the local form swaps it for the leading 0.
  if (/^8801\d{9}$/.test(digits)) return `0${digits.slice(3)}`;
  return tidy;
}

const SEPARATORS = String.raw`[\s().-]*`;

/**
 * A pattern matching a stored phone number however it was formatted when saved ("+88 01712-345678",
 * "01712345678", …), built from the last ten digits of what the visitor typed. Null if there aren't
 * enough digits to mean anything. Only digits go into the pattern, so input can't inject anything.
 */
export function phoneLookupPattern(input) {
  const digits = String(input).replace(/\D/g, '');
  if (digits.length < 8) return null;
  const tail = digits.slice(-10).split('');
  return new RegExp(String.raw`^[+\d\s().-]*` + tail.join(SEPARATORS) + '$');
}
