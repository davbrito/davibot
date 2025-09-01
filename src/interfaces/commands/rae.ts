import { CommandConfig } from "$infrastructure/commands.ts";
import {
  raeCallbackQueryHandler,
  raeChosenInlineResultHandler,
  raeCommandHandler,
  raeInlineQueryHandler,
  raeMoreCallbackQueryHandler,
} from "../handlers/rae.handler.tsx";

export const config: CommandConfig = {
  name: "rae",
  description: "Busca una palabra en la RAE",
  setup: (bot) => {
    bot.callbackQuery(/^rae-more (.+)$/, raeMoreCallbackQueryHandler);
    bot.callbackQuery(/^rae (.+)$/, raeCallbackQueryHandler);
    bot.command("rae", raeCommandHandler);
    bot.inlineQuery(/rae (.+)/, raeInlineQueryHandler);
    bot.chosenInlineResult(/^rae:(.+)$/, raeChosenInlineResultHandler);
  },
};
