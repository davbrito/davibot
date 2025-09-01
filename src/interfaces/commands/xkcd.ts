import type { CommandConfig } from "$infrastructure/commands.ts";
import { xkcdCommandHandler } from "../handlers/xkcd.handler.tsx";

export const config: CommandConfig = {
  command: "xkcd",
  description: "Get a random xkcd comic",
  setup: (bot) => {
    bot.command("xkcd", xkcdCommandHandler);
  },
};
