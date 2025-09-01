import { BotError, NextFunction } from "grammy";
import type { ReactNode } from "react";
import { DEBUG } from "../../config.ts";
import { AppContextType } from "../../context.ts";

export async function errorBoundary(
  error: BotError<AppContextType>,
  _next: NextFunction,
) {
  const { ctx } = error;

  console.error("Error occurred:", error);

  // solo si es mensaje
  if (ctx.message) {
    await ctx.replyWithReact(<ErrorMessage error={error} />);
  }
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
