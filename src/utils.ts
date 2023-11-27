import { Bot } from "grammy";
import { brightBlack, dim, green } from "@std/fmt/colors";
import { BOT_TOKEN } from "./config.ts";
import type { AppContextType } from "./main.tsx";

export * from "./markdown.ts";

export async function logStart(bot: Bot<AppContextType>, addr?: Deno.NetAddr) {
  await bot.init();
  console.log(
    brightBlack("Connected to telegram"),
    dim(green(`(@${bot.botInfo.username})`)),
    addr ? dim(`listening on ${addr.hostname}:${addr.port}`) : "",
  );
}

const numeberFormat = new Intl.NumberFormat([], {
  style: "decimal",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export async function measureDuration<T>(promise: Promise<T>): Promise<T> {
  const mark = performance.mark("handle update");
  try {
    return await promise;
  } finally {
    const measure = performance.measure("request", {
      start: mark.name,
    });
    console.log(`Request took ${numeberFormat.format(measure.duration)}ms`);
    performance.clearMarks(mark.name);
    performance.clearMeasures(measure.name);
  }
}
export function getFileUrl(file_path: string) {
  return `https://api.telegram.org/file/bot${BOT_TOKEN}/${file_path}`;
}
