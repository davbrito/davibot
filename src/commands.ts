import manifest from "$manifest";
import { Bot, Composer } from "grammy";
import { Router } from "@grammyjs/router";
import type { AppContextType } from "./main.tsx";
import { resolveCommandConfig } from "./manifest.ts";

type MaybePromise<T> = T | Promise<T>;
export type SetupFunction = (bot: Bot<AppContextType>) => MaybePromise<void>;

type AppComposer = Composer<AppContextType>;

export interface CommandConfig {
  command: string;
  description: string;
  setup?: SetupFunction;
  compose?: (composer: AppComposer) => void;
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
        end: async (ctx) => {
          await ctx.sessionManager.clean();
          return ctx.reply("Bye");
        },
      },
    ),
  );

  await bot.api.setMyCommands(
    commandConfigs
      .filter((command) => command.command)
      .map((command) => ({
        command: command.command,
        description: command.description || "",
      })),
  );

  async function loadCommandConfigs(): Promise<CommandConfig[]> {
    const commands: CommandConfig[] = [];

    for (const commandKey of Object.keys(manifest.commands)) {
      const command = await resolveCommandConfig(
        manifest.commands[commandKey as keyof typeof manifest.commands],
      );
      const config = command.config;

      if (config?.setup) {
        await config.setup(bot);
      } else if (config?.compose) {
        const composer = new Composer<AppContextType>();
        config.compose(composer);
        bot.use(composer);
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
