import { CommandConfig } from "../commands.ts";
import { bold } from "../utils.ts";

export const config: CommandConfig = {
  command: "start",
  description: "Start the bot",
  setup(bot) {
    bot.command("start", async (ctx) => {
      const msg = await ctx.reply("Hi! Tell me your name! Please", {
        reply_markup: { force_reply: true },
      });
      await ctx.sessionManager.hi.setHiRequest(msg);
    });

    bot
      .on("message:text")
      .filter((ctx) => ctx.sessionManager.hi.isHiRequestReply(ctx.message))
      .use(async (ctx) => {
        await ctx.reply(`Hello ${bold(ctx.message.text ?? "")}`, {
          parse_mode: "MarkdownV2",
        });
        await ctx.sessionManager.hi.removeHiRequest(ctx.message);
      });
  },
};
