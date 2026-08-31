import type { IAuthService } from "$application/services/auth.service.ts";
import { clearCacheUseCase } from "$application/usecases/clear-cache.usecase.ts";
import { AuthServiceAdapter } from "$infrastructure/adapters/auth.adapter.ts";
import { notifyAdmin } from "$infrastructure/helpers/notify-admin.ts";
import { DbContext } from "$infrastructure/kv/dbcontext.ts";
import { green } from "@std/fmt/colors";
import type { Api, RawApi } from "grammy";
import { type Bot, webhookCallback } from "grammy";
import { Hono } from "hono";
import z from "zod";

import type { AppContextType } from "../../context.ts";
import { logStart, measureDuration } from "../../utils.ts";

interface HttpServerContext {
  BOT_SECRET: string;
  auth: IAuthService;
  api: Api<RawApi>;
  info: Deno.ServeHandlerInfo<Deno.NetAddr>;
}

async function handleCacheFlush(req: Request, ctx: HttpServerContext) {
  const { secret } = await req.json();
  if (!ctx.auth.verify(secret)) {
    return Response.json({ error: "Invalid secret" }, { status: 403 });
  }
  await DbContext.use(clearCacheUseCase);
  return Response.json({ ok: true });
}

async function handleSetWebhook(req: Request, ctx: HttpServerContext) {
  try {
    const { url } = await req.json().then(z.object({ url: z.url() }).parse);
    const secret = req.headers.get("x-webhook-secret") || "";
    if (!ctx.auth.verify(secret)) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    await ctx.api.setWebhook(url, { secret_token: secret });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Error setting webhook", String(error));
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function serveWebhook(
  bot: Bot<AppContextType>,
  BOT_SECRET: string,
  port?: number,
) {
  console.log(green("Running on webhook mode"));
  const handleUpdate = webhookCallback(bot, "hono", {
    secretToken: BOT_SECRET,
  });

  const auth = new AuthServiceAdapter(BOT_SECRET);

  const app = new Hono<{
    Bindings: HttpServerContext & { info: Deno.ServeHandlerInfo<Deno.NetAddr> };
  }>();
  app.use((c, next) => {
    measureDuration(c.env.info.completed).catch(() => {});
    return next();
  });
  app.post("/cache/flush", (c) => handleCacheFlush(c.req.raw, c.env));
  app.post("/webhook", (c) => handleSetWebhook(c.req.raw, c.env));
  app.post("/", async (c) => {
    const response = await handleUpdate(c);

    if (response.status === 401) {
      console.error("Unauthorized request", c.req.raw);
    } else if (response.status !== 200) {
      console.error("Error handling update", c.req.raw, response);
    }
    return response;
  });
  app.notFound((c) => c.json({ error: "Not found" }, 404));
  app.onError((err, c) => {
    console.error("Internal server error", err);
    notifyAdmin(bot.api, "HTTP server", err).catch(() => {});
    return c.text("Internal Server Error", 500);
  });

  const server = Deno.serve({
    handler: (req, info) =>
      app.fetch(req, {
        auth,
        BOT_SECRET,
        api: bot.api,
        info,
      }),
    onListen(addr) {
      logStart(bot, addr);
    },
    port,
  });

  await server.finished;
}
