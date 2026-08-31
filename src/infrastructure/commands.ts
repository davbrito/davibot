import { codeBlock } from "$interfaces/helpers/markdown.ts";
import manifest from "$manifest";
import { sample } from "@std/random";
import type { Bot, Composer } from "grammy";
import { type CommandMiddleware } from "grammy";
import type { BotCommand } from "grammy/types";

import type { AppContextType } from "../context.ts";

type MaybePromise<T> = T | Promise<T>;
export type SetupFunction = (
  composer: AppComposer,
  bot: Bot<AppContextType>,
) => MaybePromise<void>;

export type AppComposer = Composer<AppContextType>;

export interface CommandConfig {
  name: string;
  description: string;
  setup?: SetupFunction;
  command?: CommandMiddleware<AppContextType>;
}

let commandConfigs: CommandConfig[] = [];

export const setupCommands: SetupFunction = async (composer, bot) => {
  commandConfigs = [
    {
      name: "about",
      description: "About the bot",
    },
    {
      name: "end",
      description: "End the bot",
    },
    ...(await loadCommandConfigs()),
  ];

  composer.command("about", (ctx) => ctx.reply("Author: @" + ctx.env.AUTHOR));

  composer.command("buildinfo", (ctx, next) => {
    if (ctx.isOwner) {
      ctx.reply(
        "Build info:\n" +
          codeBlock(JSON.stringify(manifest.buildMetadata, null, 2), "json"),
        { parse_mode: "MarkdownV2" },
      );
    } else {
      return next();
    }
  });

  composer.command("end", async (ctx) => {
    await ctx.sessionManager.clean();
    await ctx.reply("Bye");
  });

  composer.command("updatecommands", async (ctx, next) => {
    if (!ctx.isOwner) {
      return next();
    }

    await updateCommands(bot);
    await ctx.reply("Commands updated");
  });

  miscellaneousCommands(composer);

  async function loadCommandConfigs(): Promise<CommandConfig[]> {
    const commands: CommandConfig[] = [];

    const addCommand = (config: CommandConfig) => {
      commands.push(config);
      if (config.command) {
        composer.command(config.name, config.command);
      }
      if (config.setup) {
        config.setup(composer, bot);
      }
    };

    for (const commandModule of Object.values(manifest.commands)) {
      const command = await commandModule();
      if (Array.isArray(command.config)) {
        command.config.forEach(addCommand);
      } else {
        addCommand(command.config);
      }
    }

    return commands;
  }
};

export function getCommandConfigs() {
  return commandConfigs;
}

function updateCommands(bot: Bot<AppContextType>) {
  return bot.api.setMyCommands(
    commandConfigs
      .filter((command) => command.command)
      .map(
        (command): BotCommand => ({
          command: command.name,
          description: command.description || "",
        }),
      ),
  );
}

function miscellaneousCommands(composer: AppComposer) {
  composer.on("message:text").hears(/xd|(js)+|(ha(ha)+)/i, async (ctx) => {
    await ctx.reply("xD", { reply_to_message_id: ctx.message.message_id });
  });

  composer.on("message:photo", async (ctx) => {
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
    await Promise.all([ctx.react(emoji), ctx.reply(text)]);
  });

  composer.on("edited_message", (ctx) =>
    ctx.reply("Ajá! Uldepasao! Editaste eto!", {
      reply_to_message_id: ctx.msg.message_id,
    }),
  );
}
