import { withApis } from "$interfaces/middlewares/api.middleware.ts";
import { react } from "$interfaces/middlewares/react.middleware.tsx";
import { autoRetry } from "@grammyjs/auto-retry";
import { hydrate } from "@grammyjs/hydrate/plugin.ts";
import type { UserFromGetMe } from "@grammyjs/types";
import { Bot } from "grammy";
import { generateUpdateMiddleware } from "telegraf-middleware-console-time";

import { AUTHOR, BOT_TOKEN, runAsWebhook } from "../config.ts";
import type { AppContextType } from "../context.ts";
import { SessionManager } from "../session/sessions.ts";
import { withDb } from "./kv/middleware.ts";

let bot: Bot<AppContextType>;

export function getBot(initialBotInfo?: UserFromGetMe) {
  if (bot) return bot;
  bot = new Bot<AppContextType>(BOT_TOKEN, {
    botInfo: initialBotInfo ?? undefined,
  });

  bot.api.config.use(autoRetry());

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
    async (ctx, next) => {
      ctx.isOwner = ctx.from?.username === AUTHOR;
      if (ctx.isOwner && ctx.from?.id) {
        await ctx.db.adminNotifier.register(ctx.from.id);
      }
      return next();
    },
  );

  return bot;
}
