import {
  type CommandConfig,
  getCommandConfigs,
} from "$infrastructure/commands.ts";

function getHelpContent() {
  return getCommandConfigs()
    .map((c) => {
      return `/${c.name} - ${c.description}`;
    })
    .join("\n");
}

export const config: CommandConfig = {
  name: "help",
  description: "Show help",
  command: (ctx) => ctx.reply(getHelpContent()),
};
