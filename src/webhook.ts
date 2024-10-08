import { green } from "@std/fmt/colors";
import { route } from "@std/http";
import { Bot, webhookCallback } from "grammy";
import type { AppContextType } from "./main.tsx";
import { logStart, measureDuration } from "./utils.ts";
import { DbContext } from "./kv/dbcontext.ts";

export async function serveWebhook(
  bot: Bot<AppContextType>,
  BOT_SECRET: string,
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
  });

  await server.finished;
}
