import manifest from "$manifest";
import { Bot, Composer } from "grammy";
import { Router } from "@grammyjs/router";
import type { AppContextType } from "./main.tsx";

type MaybePromise<T> = T | Promise<T>;
export type SetupFunction = (bot: Bot<AppContextType>) => MaybePromise<void>;

export const AppComposer = Composer<AppContextType>;

export interface CommandConfig {
  command: string;
  description: string;
  setup?: SetupFunction;
}

let commandConfigs: CommandConfig[] = [];

export const setupCommands: SetupFunction = async (bot) => {
  commandConfigs = [
    {
      command: "about",
      description: "About the bot",
    },
    {
      command: "end",
      description: "End the bot",
    },
    ...(await loadCommandConfigs()),
  ];

  bot.on(
    "message::bot_command",
    new Router<AppContextType>(
      (ctx) => ctx.message?.text?.match(/^\/(\w+)/)?.[1],
      {
        about: (ctx) => ctx.reply("Author: @" + manifest.author),
        end: (ctx) => {
          ctx.session.clean();
          return ctx.reply("Bye");
        },
      }
    )
  );

  await bot.api.setMyCommands(
    commandConfigs
      .filter((command) => command.command)
      .map((command) => ({
        command: command.command,
        description: command.description || "",
      }))
  );

  async function loadCommandConfigs(): Promise<CommandConfig[]> {
    const commands: CommandConfig[] = [];

    for (const commandKey of Object.keys(manifest.commands)) {
      const command =
        manifest.commands[commandKey as keyof typeof manifest.commands];
      const config = command.config;
      const setup = config?.setup;

      if (setup) {
        await setup(bot);
      }

      if (config) {
        commands.push(config);
      }
    }

    return commands;
  }
};

export function getCommandConfigs() {
  return commandConfigs;
}
