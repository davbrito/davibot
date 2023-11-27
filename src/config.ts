import { load } from "@std/dotenv";
import { z } from "zod";

const dotenv = Deno.env.get("DENO_DEPLOYMENT_ID") ? {} : await load();

const env = {
  ...dotenv,
  ...Deno.env.toObject(),
};

if (dotenv.DENO_KV_ACCESS_TOKEN) {
  Deno.env.set("DENO_KV_ACCESS_TOKEN", dotenv.DENO_KV_ACCESS_TOKEN);
}

export const {
  BOT_SECRET,
  BOT_TOKEN,
  WEBHOOK_MODE,
  DENO_DEPLOYMENT_ID,
  DENO_KV_URL,
} = z
  .object({
    BOT_TOKEN: z.string({ required_error: "BOT_TOKEN is required" }).min(1),
    BOT_SECRET: z.string({ required_error: "BOT_SECRET is required" }).min(1),
    DENO_DEPLOYMENT_ID: z.unknown().optional(),
    WEBHOOK_MODE: z
      .string()
      .transform((v) => v === "true" || v === "1")
      .optional(),

    DENO_KV_URL: z.string().optional(),
  })
  .parse(env);

export const isDenoDeploy = Boolean(DENO_DEPLOYMENT_ID);
export const runAsWebhook = isDenoDeploy || WEBHOOK_MODE;
