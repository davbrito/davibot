import { green } from "@std/fmt/colors";
import { route } from "@std/http";
import { Bot, webhookCallback } from "grammy";
import type { AppContextType } from "./main.tsx";
import { logStart, measureDuration } from "./utils.ts";
import { DbContext } from "./kv/dbcontext.ts";

export async function serveWebhook(
  bot: Bot<AppContextType>,
  BOT_SECRET: string
) {
  console.log(green("Running on webhook mode"));
  const handleUpdate = webhookCallback(bot, "std/http", {
    secretToken: BOT_SECRET,
  });

  const routerHandler = route(
    [
      {
        method: "POST",
        pattern: new URLPattern({ pathname: "/cache/flush" }),
        handler: async (req) => {
          const { secret } = await req.json();
          if (secret !== BOT_SECRET) {
            return Response.json({ error: "Invalid secret" }, { status: 403 });
          }
          await DbContext.use((db) => db.clearCache());
          return Response.json({ ok: true });
        },
      },
      {
        method: "POST",
        pattern: new URLPattern({ pathname: "/" }),
        handler: (req) => handleUpdate(req),
      },
    ],
    () => Response.json({ error: "Not found" }, { status: 404 })
  );

  const server = Deno.serve({
    handler: async (req, info) => {
      measureDuration(info.completed).catch(() => {});

      try {
        return await routerHandler(req, info);
      } catch (err) {
        console.error(err);
        return new Response("Internal Server Error", { status: 500 });
      }
    },
    onListen(addr) {
      logStart(bot, addr);
    },
  });

  await server.finished;
}
