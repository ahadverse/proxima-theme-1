import { ApiError } from '../utils/ApiError.js';

/**
 * Validates req.body (default) against a zod schema. Pass `{ source: 'query' }` to validate
 * req.query instead. Replaces req[source] with the parsed (and type-coerced) result.
 */
export const validate = (schema, { source = 'body' } = {}) => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.flatten().fieldErrors;
    return next(ApiError.badRequest('Validation failed', details));
  }
  req[source] = result.data;
  next();
};
