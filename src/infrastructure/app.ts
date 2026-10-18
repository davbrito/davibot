import { notifyAdmin } from "$infrastructure/helpers/notify-admin.ts";
import { errorBoundary } from "$interfaces/middlewares/error-handler.middleware";
import { type Api, type Bot, Composer, type RawApi } from "grammy";
import { createFactory } from "hono/factory";
import { logger } from "hono/logger";

import type { AppContextType } from "../context";
import { getBot } from "./bot";
import { type AppComposer, setupCommands } from "./commands";
import { DbContext, dbStorage } from "./kv/dbcontext";
import { createKvStorage } from "./kv/storage";

export type AppBindings = {
  /** Bot owner, injected by each entrypoint. */
  AUTHOR: string;
  /** Secret token used to validate incoming Telegram webhook requests. */
  BOT_SECRET: string;
  /** Cloudflare KV namespace binding. */
  KV: KVNamespace;
  /**
   * Platform hook that keeps background work alive after the response is sent.
   */
  waitUntil?: (promise: Promise<unknown>) => void;
};

export interface HonoEnv {
  Bindings: AppBindings;
  Variables: {
    bot: Bot<AppContextType, Api<RawApi>>;
    db: DbContext;
  };
}

export const factory = createFactory<HonoEnv>({
  initApp(app) {
    app.use(
      logger(),
      async (c, next) => {
        const storage = createKvStorage(c.env.KV);
        const db = DbContext.connect(storage);
        c.set("db", db);
        return dbStorage.run(db, () => next());
      },
      botMiddleware(),
    );
  },
});

function botMiddleware() {
  let botInstance: ReturnType<typeof getBot> | null = null;
  return factory.createMiddleware(async (c, next) => {
    if (!botInstance) {
      const initialBotInfo = await c.var.db.botInfo.get();
      const bot = getBot(initialBotInfo, c.env.AUTHOR);

      const composer: AppComposer = new Composer();
      await setupCommands(composer, bot, c.env.AUTHOR);
      bot.errorBoundary(errorBoundary).use(composer);
      bot.catch((error) => {
        console.error(
          'Error caught in "bot.catch":',
          String(error) + "\n" + error.stack,
        );
        c.env.waitUntil?.(
          notifyAdmin(error.ctx.api, "bot.catch", error).catch(() => {}),
        );
      });
      botInstance = bot;
    }
    c.set("bot", botInstance);
    await next();
  });
}
