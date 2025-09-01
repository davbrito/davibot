import manifest from "$manifest";
import { Bot, Composer } from "grammy";
import type { AppContextType } from "./context.ts";
import { resolveCommandConfig } from "./manifest.ts";
import { retry } from "@std/async/retry";
import { errorBoundary } from "$interfaces/middlewares/error-handler.middleware.tsx";

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
  const composer = new Composer<AppContextType>();
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

  composer.command("about", (ctx) => ctx.reply("Author: @" + manifest.author));

  composer.command("end", async (ctx) => {
    await ctx.sessionManager.clean();
    await ctx.reply("Bye");
  });

  bot.errorBoundary(errorBoundary).use(composer);

  retry(
    () =>
      bot.api.setMyCommands(
        commandConfigs
          .filter((command) => command.command)
          .map((command) => ({
            command: command.command,
            description: command.description || "",
          })),
      ),
    {
      maxAttempts: 3,
    },
  )
    .then(() => {
      console.log("Commands set up successfully");
    })
    .catch((err) => {
      console.error("Error setting up commands:", err);
    });

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
        config.compose(composer);
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
