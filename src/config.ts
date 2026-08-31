import { z } from "zod";

export const { BOT_SECRET, BOT_TOKEN, WEBHOOK_MODE, DEBUG } = parseEnv(
  z.object({
    BOT_TOKEN: z.string({ error: "BOT_TOKEN is required" }).nonempty(),
    BOT_SECRET: z.string({ error: "BOT_SECRET is required" }).nonempty(),
    WEBHOOK_MODE: z.stringbool().default(false),

    DEBUG: z.union([z.stringbool(), z.string()]).default(false),
  }),
);

export const runAsWebhook = WEBHOOK_MODE;

function parseEnv<T extends z.core.$ZodType>(schema: T): z.core.output<T> {
  const result = z.safeParse(schema, process.env);

  if (result.success) return result.data;

  const error = result.error;
  console.error("Invalid environment variables:\n", z.prettifyError(error));
  process.exit(1);
}
