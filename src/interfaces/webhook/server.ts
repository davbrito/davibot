import { IAuthService } from "$application/services/auth.service.ts";
import { clearCacheUseCase } from "$application/usecases/clear-cache.usecase.ts";
import { AuthServiceAdapter } from "$infrastructure/adapters/auth.adapter.ts";
import { DbContext } from "$infrastructure/kv/dbcontext.ts";
import { green } from "@std/fmt/colors";
import { route } from "@std/http/unstable-route";
import { Api, Bot, RawApi, webhookCallback } from "grammy";
import { AppContextType } from "../../context.ts";
import { logStart, measureDuration } from "../../utils.ts";
import z from "zod";

interface HttpServerContext {
  BOT_SECRET: string;
  auth: IAuthService;
  api: Api<RawApi>;
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
  const { url } = await req.json().then(z.object({ url: z.url() }).parse);
  const secret = req.headers.get("x-webhook-secret") || "";
  if (!ctx.auth.verify(secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  await ctx.api.setWebhook(url, { secret_token: secret });

  return Response.json({ ok: true });
}

export async function serveWebhook(
  bot: Bot<AppContextType>,
  BOT_SECRET: string,
  port?: number,
) {
  console.log(green("Running on webhook mode"));
  const handleUpdate = webhookCallback(bot, "std/http", {
    secretToken: BOT_SECRET,
  });

  const context: HttpServerContext = {
    BOT_SECRET,
    auth: new AuthServiceAdapter(BOT_SECRET),
    api: bot.api,
  };

  const routerHandler = route(
    [
      {
        method: "POST",
        pattern: new URLPattern({ pathname: "/cache/flush" }),
        handler: (req) => handleCacheFlush(req, context),
      },
      {
        method: "POST",
        pattern: new URLPattern({ pathname: "/webhook" }),
        handler: (req) => handleSetWebhook(req, context),
      },
      {
        method: "POST",
        pattern: new URLPattern({ pathname: "/" }),
        handler: async (req) => {
          const response = await handleUpdate(req);

          if (response.status === 401) {
            console.error("Unauthorized request", req);
          } else if (response.status !== 200) {
            console.error("Error handling update", req, response);
          }
          return response;
        },
      },
    ],
    () => Response.json({ error: "Not found" }, { status: 404 }),
  );

  const server = Deno.serve({
    handler: async (req, info) => {
      measureDuration(info.completed).catch(() => {});

      try {
        return await routerHandler(req, info);
      } catch (err) {
        console.error("Internal server error", err);
        return new Response("Internal Server Error", { status: 500 });
      }
    },
    onListen(addr) {
      logStart(bot, addr);
    },
    onError(error) {
      console.error("Internal server error", error);
      return new Response("Internal Server Error", { status: 500 });
    },
    port,
  });

  await server.finished;
}
