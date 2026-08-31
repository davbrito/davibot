import { notifyAdmin } from "$infrastructure/helpers/notify-admin.ts";
import { errorBoundary } from "$interfaces/middlewares/error-handler.middleware";
import { Composer, type Api, type Bot, type RawApi } from "grammy";
import { createFactory } from "hono/factory";
import { logger } from "hono/logger";

import type { AppContextType } from "../context";
import { getBot } from "./bot";
import { setupCommands, type AppComposer } from "./commands";
import { DbContext } from "./kv/dbcontext";

export interface HonoEnv {
  Bindings: CloudflareBindings;
  Variables: {
    bot: Bot<AppContextType, Api<RawApi>>;
    db: DbContext;
  };
}

export const factory = createFactory<HonoEnv>({
  initApp(app) {
    app.use(logger(), botMiddleware(), (c, next) => {
      c.set("db", DbContext.connect());
      return next();
    });
  },
});

function botMiddleware() {
  let botInstance: ReturnType<typeof getBot> | null = null;
  return factory.createMiddleware(async (c, next) => {
    if (!botInstance) {
      const initialBotInfo = await DbContext.use((db) => db.botInfo.get());
      const bot = getBot(initialBotInfo ?? undefined);

      const composer: AppComposer = new Composer();
      await setupCommands(composer, bot);
      bot.errorBoundary(errorBoundary).use(composer);
      bot.catch((error) => {
        console.error(
          'Error caught in "bot.catch":',
          String(error) + "\n" + error.stack,
        );
        c.executionCtx.waitUntil(
          notifyAdmin(error.ctx.api, "bot.catch", error).catch(() => {}),
        );
      });
      botInstance = bot;
    }
    c.set("bot", botInstance);
    await next();
  });
}
