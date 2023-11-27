import { CommandConfig, getCommandConfigs } from "../commands.ts";

function getHelpContent() {
  return getCommandConfigs()
    .map((c) => {
      return `/${c.command} - ${c.description}`;
    })
    .join("\n");
}

export const config: CommandConfig = {
  command: "help",
  description: "Show help",
  setup: (bot) => {
    bot.command("help", (ctx) => ctx.reply(getHelpContent()));
  },
};
