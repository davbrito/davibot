import type { BotError, NextFunction } from "grammy";
import type { ReactNode } from "react";

import { DEBUG } from "../../config.ts";
import type { AppContextType } from "../../context.ts";
import { UpstreamUnavailableError } from "../../errors.ts";
import { notifyAdmin } from "../../infrastructure/helpers/notify-admin.ts";

export async function errorBoundary(
  error: BotError<AppContextType>,
  _next: NextFunction,
) {
  const { ctx } = error;

  // Upstream outages (e.g. dle.rae.es replying with a Cloudflare challenge) are
  // expected operational conditions, not bugs, but they still warrant a ping to
  // the admin. `RaeRepository` already logged the details; here we notify and
  // answer the user politely instead of with the generic failure message.
  if (error.error instanceof UpstreamUnavailableError) {
    await notifyAdmin(ctx.api, "errorBoundary", error.error);

    if (ctx.message) {
      await ctx.replyWithReact(<UpstreamErrorMessage error={error.error} />);
    } else if (ctx.callbackQuery) {
      await ctx
        .answerCallbackQuery({
          text: "La RAE no responde ahora mismo. Inténtalo de nuevo en unos minutos.",
          show_alert: true,
        })
        .catch(() => {});
    }
    return;
  }

  console.error("Error occurred:", error);

  await notifyAdmin(ctx.api, "errorBoundary", error);

  // solo si es mensaje
  if (ctx.message) {
    await ctx.replyWithReact(<ErrorMessage error={error} />);
  }
}

function UpstreamErrorMessage({
  error,
}: {
  error: UpstreamUnavailableError;
}): ReactNode {
  return (
    <>
      {"No he podido consultar la RAE ahora mismo. Vuelve a intentarlo en unos minutos."}
      {DEBUG ? <pre>{error.message}</pre> : null}
    </>
  );
}

function ErrorMessage({ error }: { error: unknown }): ReactNode {
  return (
    <>
      {"Your request could not be completed. Please try again later."}
      {"\n"}
      {"If the problem persists, please contact the bot owner."}
      {DEBUG ? <pre>{(error as Error).message}</pre> : null}
    </>
  );
}
