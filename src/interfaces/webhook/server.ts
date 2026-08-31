import type { IAuthService } from "$application/services/auth.service.ts";
import { clearCacheUseCase } from "$application/usecases/clear-cache.usecase.ts";
import { AuthServiceAdapter } from "$infrastructure/adapters/auth.adapter.ts";
import type { HonoEnv } from "$infrastructure/app.ts";
import { notifyAdmin } from "$infrastructure/helpers/notify-admin.ts";
import { DbContext } from "$infrastructure/kv/dbcontext.ts";
import { green } from "@std/fmt/colors";
import type { Api } from "grammy";
import { type RawApi, webhookCallback } from "grammy";
import type { Hono } from "hono";
import z from "zod";

interface HttpServerContext {
  BOT_SECRET: string;
  auth: IAuthService;
  api: Api<RawApi>;
}

async function handleCacheFlush(secret: string, ctx: HttpServerContext) {
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

export function serveWebhook(app: Hono<HonoEnv>) {
  console.log(green("Running on webhook mode"));

  app.post("/cache/flush", async (c) => {
    const body = await c.req.json();
    const secret = body.secret;
    const BOT_SECRET = c.env.BOT_SECRET;
    return handleCacheFlush(secret, {
      BOT_SECRET,
      auth: new AuthServiceAdapter(BOT_SECRET),
      api: c.var.bot.api,
    });
  });

  app.post("/webhook", async (c) =>
    handleSetWebhook(c.req.raw, {
      BOT_SECRET: c.env.BOT_SECRET,
      auth: new AuthServiceAdapter(c.env.BOT_SECRET),
      api: c.var.bot.api,
    }),
  );

  app.post("/telegram", async (c) => {
    const req = c.req.raw;

    const response = await webhookCallback(c.var.bot, "cloudflare-mod", {
      secretToken: c.env.BOT_SECRET,
    })(req);

    if (response.status === 401) {
      console.error("Unauthorized request", req);
    } else if (response.status !== 200) {
      console.error("Error handling update", req, response);
    }
    return response;
  });

  app.notFound((c) => c.json({ error: "Not found" }, 404));

  app.onError((err, c) => {
    console.error("Internal server error", err);
    c.executionCtx.waitUntil(
      notifyAdmin(c.var.bot.api, "HTTP server", err).catch(() => {}),
    );
    return c.text("Internal Server Error", 500);
  });

  return app;
}
