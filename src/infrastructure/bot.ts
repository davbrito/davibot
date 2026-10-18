import { withApis } from "$interfaces/middlewares/api.middleware.ts";
import { react } from "$interfaces/middlewares/react.middleware.tsx";
import { autoRetry } from "@grammyjs/auto-retry";
import { hydrate } from "@grammyjs/hydrate";
import { Api, Bot } from "grammy";
import type { UserFromGetMe } from "grammy/types";
import { generateUpdateMiddleware } from "telegraf-middleware-console-time";

import { BOT_TOKEN, runAsWebhook } from "../config.ts";
import type { AppContextType } from "../context.ts";
import { SessionManager } from "../session/sessions.ts";
import { withDb } from "./kv/middleware.ts";

let bot: Bot<AppContextType>;
// The owner is supplied by each entrypoint (Deno config, Workers binding,
// etc.) so the bot wiring stays runtime-independent.
let botAuthor: string | undefined;

export function getApi() {
  return new Api(BOT_TOKEN);
}

export function getBot(initialBotInfo?: UserFromGetMe, author?: string) {
  if (author !== undefined) botAuthor = author;

  if (bot) return bot;
  bot = new Bot<AppContextType>(BOT_TOKEN, {
    botInfo: initialBotInfo ?? undefined,
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
      ctx.isOwner = ctx.from?.username === botAuthor;
      if (ctx.isOwner && ctx.from?.id) {
        await ctx.db.adminNotifier.register(ctx.from.id);
      }
      return next();
    },
  );

  return bot;
}
