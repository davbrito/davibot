import { green } from "@std/fmt/colors";
import { route } from "@std/http";
import { Bot, webhookCallback } from "grammy";
import type { AppContextType } from "./main.tsx";
import { logStart, measureDuration } from "./utils.ts";

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
        pattern: new URLPattern({ pathname: "/" }),
        handler: (req) => handleUpdate(req),
      },
    ],
    () => new Response(null, { status: 404 })
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
