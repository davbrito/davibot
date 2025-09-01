import { CommandConfig } from "../../commands.ts";
import codeCommandHandler from "../handlers/code.handler.tsx";

export const config: CommandConfig = {
  command: "code",
  description: "Show code",
  setup: (bot) => {
    bot.command("code", codeCommandHandler);
  },
};
