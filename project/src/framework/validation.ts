import type { ZodSchema } from "zod";
import { ValidationError } from "./errors";

/**
 * Parses `data` against `schema`, throwing a typed ValidationError (-> HTTP 400)
 * on failure instead of letting a ZodError leak past the framework boundary.
 */
export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError("Request failed validation", result.error.issues);
  }
  return result.data;
}
