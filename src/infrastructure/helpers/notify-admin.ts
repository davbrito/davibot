import manifest from "$manifest";
import type { Api, Bot, RawApi } from "grammy";

import type { AppContextType } from "../../context.ts";
import { DbContext } from "../kv/dbcontext.ts";

const MAX_ERROR_LENGTH = 3500;

interface GrammyErrorLike {
  error_code?: number;
  description?: string;
  parameters?: unknown;
}

/**
 * Turn any thrown value into a plain object so structured logs can index its
 * fields (`name`, `message`, `error_code`, …) instead of collapsing it into an
 * opaque string. grammY errors carry the useful metadata (`error_code`,
 * `description`) that a raw stack trace hides.
 */
function errorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof AggregateError) {
    return {
      name: error.name,
      message: error.message,
      errors: error.errors.map(errorDetails),
    };
  }

  if (!(error instanceof Error)) return { message: String(error) };

  const { error_code, description, parameters } =
    error as Partial<GrammyErrorLike>;

  return {
    name: error.name,
    message: error.message,
    error_code,
    description,
    parameters,
    stack: error.stack,
  };
}

function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max) + "\n… (truncated)";
}

/**
 * Send a failure notification to all registered admin chat IDs.
 * Fully resilient: safe to call even if fetching IDs fails, formatting fails,
 * or sending messages fails. Never throws.
 */
export async function notifyAdmin(
  api: Api<RawApi>,
  context: string,
  error: unknown,
): Promise<void> {
  try {
    let ids: number[] = [];
    try {
      ids = await DbContext.use((db) => db.adminNotifier.getIds());
    } catch (dbError) {
      console.error("Failed to retrieve admin chat IDs for notification", {
        error: errorDetails(dbError),
      });
      return;
    }

    if (!ids || ids.length === 0) return;

    const errorMessage =
      error instanceof Error
        ? `${error.message}\n\n${error.stack ?? ""}`
        : String(error);

    const version = manifest.buildMetadata?.version ?? "?";
    const header = `⚠️ *Bot Failure — ${context}*`;
    const body = truncate(errorMessage, MAX_ERROR_LENGTH);
    const footer = `_v${version}_`;

    const textMarkdown = `${header}\n\n${body}\n\n${footer}`;
    const plainText = `⚠️ Bot Failure — ${context}\n\n${body}\n\nv${version}`;

    const results = await Promise.allSettled(
      ids.map(async (chatId) => {
        try {
          return await api.sendMessage(chatId, textMarkdown, {
            parse_mode: "MarkdownV2",
          });
        } catch (markdownError) {
          // If MarkdownV2 parsing fails (e.g. unescaped special characters in
          // the error trace), fall back to plain text without parse_mode.
          try {
            return await api.sendMessage(chatId, plainText);
          } catch (plainTextError) {
            throw new AggregateError(
              [markdownError, plainTextError],
              `Failed to notify admin (chat ${chatId}): both MarkdownV2 and plain text were rejected`,
            );
          }
        }
      }),
    );

    for (const [index, result] of results.entries()) {
      if (result.status === "rejected") {
        console.error("Failed to notify admin", {
          chatId: ids[index],
          error: errorDetails(result.reason),
        });
      }
    }
  } catch (err) {
    console.error("Unexpected error in notifyAdmin", {
      error: errorDetails(err),
    });
  }
}

/** Convenience overload that accepts the bot object directly. */
export async function notifyAdminFromBot(
  bot: Bot<AppContextType>,
  context: string,
  error: unknown,
) {
  return await notifyAdmin(bot.api, context, error);
}
