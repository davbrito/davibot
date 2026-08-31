import { withApis } from "$interfaces/middlewares/api.middleware.ts";
import { react } from "$interfaces/middlewares/react.middleware.tsx";
import { autoRetry } from "@grammyjs/auto-retry";
import { hydrate } from "@grammyjs/hydrate";
import { env } from "cloudflare:workers";
import { Api, Bot } from "grammy";
import type { UserFromGetMe } from "grammy/types";
import { generateUpdateMiddleware } from "telegraf-middleware-console-time";

import { BOT_TOKEN, runAsWebhook } from "../config.ts";
import type { AppContextType } from "../context.ts";
import { SessionManager } from "../session/sessions.ts";
import { withDb } from "./kv/middleware.ts";

let bot: Bot<AppContextType>;

export function getApi() {
  return new Api(BOT_TOKEN);
}

export function getBot(initialBotInfo?: UserFromGetMe) {
  if (bot) return bot;
  bot = new Bot<AppContextType>(BOT_TOKEN, {
    botInfo: initialBotInfo,
  });

  bot.api.config.use(autoRetry());

  if (!runAsWebhook) {
    bot.use(generateUpdateMiddleware());
  }

  bot.use(
    withApis(),
    withDb(),
    hydrate(),
    react(),
    SessionManager.middleware(),
    async (ctx, next) => {
      ctx.env = env;
      ctx.isOwner = ctx.from?.username === ctx.env.AUTHOR;
      if (ctx.isOwner && ctx.from?.id) {
        await ctx.db.adminNotifier.register(ctx.from.id);
      }
      return next();
    },
  );

  return bot;
}
