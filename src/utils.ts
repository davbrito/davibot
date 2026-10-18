import { brightBlack, dim, green } from "@std/fmt/colors";
import type { Bot } from "grammy";

import { BOT_TOKEN } from "./config.ts";
import type { AppContextType } from "./context.ts";

export async function logStart(
  bot: Bot<AppContextType>,
  addr?: { hostname: string; port: number },
) {
  await bot.init();
  console.log(
    brightBlack("Connected to telegram"),
    dim(green(`(@${bot.botInfo.username})`)),
    addr ? dim(`listening on ${addr.hostname}:${addr.port}`) : "",
  );
}

export function getFileUrl(file_path: string) {
  return `https://api.telegram.org/file/bot${BOT_TOKEN}/${file_path}`;
}
