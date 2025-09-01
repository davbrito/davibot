import { z } from "zod";

export function env<T extends z.core.$ZodLooseShape>(
  schema: T,
  value?: unknown,
) {
  return z.parse(z.object(schema), value ?? Deno.env.toObject());
}
