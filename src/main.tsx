import "$interfaces/jobs/controllers.ts";

import { getBot } from "$infrastructure/bot.ts";
import { setupCommands } from "$infrastructure/commands.ts";
import { DbContext } from "$infrastructure/kv/dbcontext.ts";
import { serveWebhook } from "$interfaces/webhook/server.ts";
import { Api, Bot, Composer, RawApi } from "grammy";
import { BOT_SECRET, runAsWebhook } from "./config.ts";
import { AppContextType } from "./context.ts";
import { logStart } from "./utils.ts";

async function main() {
  console.log("Starting bot...");

  const initialBotInfo = await DbContext.use((db) => db.botInfo.get());
  const bot = getBot(initialBotInfo ?? undefined);

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
