import { z } from "zod";

export function env<T extends z.core.$ZodLooseShape>(schema: T) {
  return z.parse(z.object(schema), Deno.env.toObject());
}
