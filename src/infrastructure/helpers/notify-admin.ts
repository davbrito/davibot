import manifest from "$manifest";
import type { Api, RawApi } from "grammy";
import type { Bot } from "grammy";

import type { AppContextType } from "../../context.ts";
import { DbContext } from "../kv/dbcontext.ts";

const MAX_ERROR_LENGTH = 3500;

function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max) + "\n… (truncated)";
}

/**
 * Send a failure notification to all registered admin chat IDs.
 * Safe to call even if no admin is registered (silently does nothing).
 */
export async function notifyAdmin(
  api: Api<RawApi>,
  context: string,
  error: unknown,
) {
  const ids = await DbContext.use((db) => db.adminNotifier.getIds());
  if (ids.length === 0) return;

  const errorMessage =
    error instanceof Error
      ? `${error.message}\n\n${error.stack ?? ""}`
      : String(error);

  const text =
    `⚠️ *Bot Failure — ${context}*\n\n` +
    truncate(errorMessage, MAX_ERROR_LENGTH) +
    "\n\n" +
    `_v${manifest.buildMetadata?.version ?? "?"}_`;

  const results = await Promise.allSettled(
    ids.map((chatId) =>
      api.sendMessage(chatId, text, { parse_mode: "MarkdownV2" }),
    ),
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Failed to notify admin:", result.reason);
    }
  }
}

/** Convenience overload that accepts the bot object directly. */
export async function notifyAdminFromBot(
  bot: Bot<AppContextType>,
  context: string,
  error: unknown,
) {
  return notifyAdmin(bot.api, context, error);
}
