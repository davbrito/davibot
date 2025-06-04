import { load } from "@std/dotenv";
import { z } from "zod";

export const {
  BOT_SECRET,
  BOT_TOKEN,
  WEBHOOK_MODE,
  DENO_DEPLOYMENT_ID,
  DENO_KV_URL,
  DEBUG,
} = await parseEnv(
  z.object({
    BOT_TOKEN: z.string({ error: "BOT_TOKEN is required" }).nonempty(),
    BOT_SECRET: z.string({ error: "BOT_SECRET is required" }).nonempty(),
    DENO_DEPLOYMENT_ID: z.unknown().optional(),
    WEBHOOK_MODE: z
      .stringbool()
      .default(false),

    DENO_KV_URL: z.string().optional(),
    DEBUG: z.stringbool().default(false),
  }),
);

export const isDenoDeploy = Boolean(DENO_DEPLOYMENT_ID);
export const runAsWebhook = isDenoDeploy || WEBHOOK_MODE;

async function parseEnv<T extends z.core.$ZodType>(
  schema: T,
): Promise<z.core.output<T>> {
  const dotenv = Deno.env.get("DENO_DEPLOYMENT_ID") ? {} : await load();

  const env = {
    ...dotenv,
    ...Deno.env.toObject(),
  };

  if (dotenv.DENO_KV_ACCESS_TOKEN) {
    Deno.env.set("DENO_KV_ACCESS_TOKEN", dotenv.DENO_KV_ACCESS_TOKEN);
  }

  const result = z.safeParse(schema, env);

  if (result.success) return result.data;

  const error = result.error;
  console.error("Invalid environment variables:\n", z.prettifyError(error));
  Deno.exit(1);
}
