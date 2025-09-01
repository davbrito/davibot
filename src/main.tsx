import { setupCommands } from "$infrastructure/commands.ts";
import { DbContext } from "$infrastructure/kv/dbcontext.ts";
import { withDb } from "$infrastructure/kv/middleware.ts";
import { withApis } from "$interfaces/middlewares/api.middleware.ts";
import { react } from "$interfaces/middlewares/react.middleware.tsx";
import { serveWebhook } from "$interfaces/webhook/server.ts";
import { hydrate } from "@grammyjs/hydrate/mod.ts";
import { Api, Bot, Composer, RawApi } from "grammy";
import { generateUpdateMiddleware } from "telegraf-middleware-console-time";
import { BOT_SECRET, BOT_TOKEN, runAsWebhook } from "./config.ts";
import { AppContextType } from "./context.ts";
import { SessionManager } from "./session/sessions.ts";
import { logStart } from "./utils.ts";
import manifest from "$manifest";

async function main() {
  console.log("Starting bot...");

  const initialBotInfo = await DbContext.use((db) => db.botInfo.get());

  const bot = new Bot<AppContextType>(BOT_TOKEN, {
    botInfo: initialBotInfo ?? undefined,
  });

  if (!runAsWebhook) {
    bot.use(generateUpdateMiddleware(), (ctx, next) => {
      console.log(`Received update: ${ctx.update.update_id}, type:`, ctx);
      return next();
    });
  }

  bot.use(
    withApis(),
    withDb(),
    hydrate(),
    react(),
    SessionManager.middleware(),
    (ctx, next) => {
      ctx.isOwner = ctx.from?.username === manifest.author;
      return next();
    },
  );

  await setupCommands(new Composer(), bot);

  bot.catch((error) => {
    console.error(
      'Error caught in "bot.catch":',
      String(error) + "\n" + error.stack,
    );
  });

  if (runAsWebhook) {
    await serveWebhook(bot, BOT_SECRET);
  } else {
    await serveLongPolling(bot);
  }
}

if (import.meta.main) {
  main();
}

async function serveLongPolling(bot: Bot<AppContextType, Api<RawApi>>) {
  const gracefulShutdown = async () => {
    console.log("Shutting down gracefully...");
    await bot.stop();
    Deno.exit();
  };

  Deno.addSignalListener("SIGINT", gracefulShutdown);
  Deno.addSignalListener("SIGTERM", gracefulShutdown);
  addEventListener("unhandledrejection", gracefulShutdown);
  addEventListener("error", gracefulShutdown);
  try {
    await bot.start({
      onStart: (info) => {
        console.log("Bot info:", info);
        DbContext.use((db) => db.botInfo.set(info));
        logStart(bot);
      },
    });
  } catch (error) {
    console.error("Error starting bot:", error);
  } finally {
    Deno.removeSignalListener("SIGINT", gracefulShutdown);
    Deno.removeSignalListener("SIGTERM", gracefulShutdown);
    removeEventListener("unhandledrejection", gracefulShutdown);
    removeEventListener("error", gracefulShutdown);
  }
}
