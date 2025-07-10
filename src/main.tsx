import { hydrate } from "@grammyjs/hydrate/mod.ts";
import { sample } from "@std/random";
import { Bot } from "grammy";
import { AppContextType } from "./context.ts";
import { setupCommands } from "./commands.ts";
import { BOT_SECRET, BOT_TOKEN, runAsWebhook } from "./config.ts";
import { DbContext } from "./kv/dbcontext.ts";
import { withDb } from "./kv/middleware.ts";
import { withApis } from "./middlewares/apis.ts";
import { react } from "./react.tsx";
import { SessionManager } from "./session/sessions.ts";
import { logStart, measureDuration } from "./utils.ts";
import { serveWebhook } from "./webhook.ts";

async function main() {
  console.log("Starting bot...");

  const initialBotInfo = await DbContext.use((db) => db.botInfo.get());

  const bot = new Bot<AppContextType>(BOT_TOKEN, {
    botInfo: initialBotInfo ?? undefined,
  });

  if (!runAsWebhook) {
    bot.use((_ctx, next) => measureDuration(next()));
  }

  bot.use(
    withApis(),
    withDb(),
    hydrate(),
    react(),
    SessionManager.middleware(),
  );

  await setupCommands(bot);

  bot.on("message:text").hears(/xd|(js)+|(ha(ha)+)/i, async (ctx) => {
    await ctx.reply("xD", { reply_to_message_id: ctx.message.message_id });
  });

  bot.on("message:photo", async (ctx) => {
    const reactions = [
      {
        emoji: "👍" as const,
        text: "¡Qué bien! 👍",
      },
      {
        emoji: "👎" as const,
        text: "¡Vaya! 😔",
      },
      {
        emoji: "😍" as const,
        text: "¡Qué bonito! 😍",
      },
      {
        emoji: "😍" as const,
        text: "¡Qué foto tan bonita! 😍",
      },
      {
        emoji: "😡" as const,
        text: "¡Oh no! 😡",
      },
      {
        emoji: "😁" as const,
        text: "¡Qué risa! 😂",
      },
      {
        emoji: "🤔" as const,
        text: "¡Qué interesante! 🤔",
      },
    ];

    const { emoji, text } = sample(reactions)!;
    await Promise.all([
      ctx.message.react(emoji),
      ctx.reply(text, {
        reply_to_message_id: ctx.message.message_id,
      }),
    ]);
  });

  bot.on("edited_message", (ctx) =>
    ctx.reply("Ajá! Uldepasao! Editaste eto!", {
      reply_to_message_id: ctx.editedMessage.message_id,
    }),
  );

  bot.catch((error) => {
    console.error(
      'Error caught in "bot.catch":',
      String(error) + "\n" + error.stack,
    );
  });

  if (runAsWebhook) {
    await serveWebhook(bot, BOT_SECRET);
  } else {
    await bot.start({
      onStart: (info) => {
        DbContext.use((db) => db.botInfo.set(info));
        logStart(bot);
      },
    });
  }
}

if (import.meta.main) {
  main();
}
