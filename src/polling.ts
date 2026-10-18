import { DbContext } from "$infrastructure/kv/dbcontext";
import type { Bot, Api } from "grammy";
import { type RawApi } from "grammy";

import type { AppContextType } from "./context";
import { logStart } from "./utils";

export async function serveLongPolling(bot: Bot<AppContextType, Api<RawApi>>) {
  const gracefulShutdown = async () => {
    console.log("Shutting down gracefully...");
    await bot.stop();
    process.exit();
  };

  process.on("SIGINT", gracefulShutdown);
  process.on("SIGTERM", gracefulShutdown);
  process.on("unhandledRejection", gracefulShutdown);
  process.on("uncaughtException", gracefulShutdown);
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
    process.off("SIGINT", gracefulShutdown);
    process.off("SIGTERM", gracefulShutdown);
    process.off("unhandledRejection", gracefulShutdown);
    process.off("uncaughtException", gracefulShutdown);
  }
}
