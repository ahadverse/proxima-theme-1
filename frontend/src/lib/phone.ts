/**
 * Same rule the API applies (digits with the usual separators, 8–20 long): "abc" is caught on the
 * form instead of after a round trip. Anything stricter would turn away valid numbers from other formats.
 */
const PHONE = /^\+?[0-9][0-9\s-]{6,18}[0-9]$/;

export function isValidPhone(value: string): boolean {
  return PHONE.test(value.trim());
}
