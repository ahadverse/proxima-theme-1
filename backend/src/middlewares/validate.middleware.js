import { ApiError } from '../utils/ApiError.js';

/**
 * Validates req.body (default) against a zod schema. Pass `{ source: 'query' }` to validate
 * req.query instead. Replaces req[source] with the parsed (and type-coerced) result.
 */
export const validate = (schema, { source = 'body' } = {}) => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.flatten().fieldErrors;
    // The forms only show the top-level message, so lead with the first concrete problem ("Password must be at least 8
    // characters") instead of a bare "Validation failed". The full per-field list stays in `details`.
    const [field, messages] = Object.entries(details)[0] ?? [];
    const first = messages?.[0];
    const message = !first ? 'Validation failed' : /^(Required|Invalid|Expected)/.test(first) ? `${field}: ${first}` : first;
    return next(ApiError.badRequest(message, details));
  }
  req[source] = result.data;
  next();
};
