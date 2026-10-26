import type { ZodTypeAny, infer as Infer } from 'zod3';
import { ApiError } from './errors';

/**
 * The API's validate middleware: checks a request body or query against one of its own zod schemas (copied into
 * engine/backend) and returns the parsed, type-coerced value — or a 400 whose message leads with the first concrete
 * problem, exactly as the API words it.
 */
export function validate<S extends ZodTypeAny>(schema: S, value: unknown): Infer<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const details = result.error.flatten().fieldErrors as Record<string, string[] | undefined>;
    const [field, messages] = Object.entries(details)[0] ?? [];
    const first = messages?.[0];
    const message = !first ? 'Validation failed' : /^(Required|Invalid|Expected)/.test(first) ? `${field}: ${first}` : first;
    throw ApiError.badRequest(message, details);
  }
  return result.data;
}
