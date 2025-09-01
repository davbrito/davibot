import { CommandConfig } from "$infrastructure/commands.ts";
import codeCommandHandler from "../handlers/code.handler.tsx";

export const config: CommandConfig = {
  command: "code",
  description: "Show code",
  setup: (bot) => {
    bot.command("code", codeCommandHandler);
  },
};
