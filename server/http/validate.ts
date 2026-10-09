import type { z } from "zod";
import { ValidationError, fieldErrorsFromZod } from "./errors";

/** Parses `request.json()` against a Zod schema, throwing a typed ValidationError on failure. */
export async function parseJsonBody<T extends z.ZodTypeAny>(request: Request, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ValidationError({ _: ["نص الطلب يجب أن يكون JSON صالحًا"] });
  }
  const result = schema.safeParse(raw);
  if (!result.success) throw new ValidationError(fieldErrorsFromZod(result.error));
  return result.data;
}

/** Parses `url.searchParams` against a Zod schema, throwing a typed ValidationError on failure. */
export function parseQuery<T extends z.ZodTypeAny>(url: URL, schema: T): z.infer<T> {
  const raw = Object.fromEntries(url.searchParams.entries());
  const result = schema.safeParse(raw);
  if (!result.success) throw new ValidationError(fieldErrorsFromZod(result.error));
  return result.data;
}
