import { getXkcdUsecase } from "$application/usecases/get-xkcd.usecase.ts";
import { XkcdRepository } from "$infrastructure/repositories/xkcd.repository.ts";
import { CommandContext } from "grammy";
import { AppContextType } from "../../context.ts";
import { loaderMessage } from "../helpers/loader.tsx";
import { createXkcdResponse } from "../helpers/xkcd-response.helper.tsx";

export async function xkcdCommandHandler(ctx: CommandContext<AppContextType>) {
  await loaderMessage(
    ctx,
    {
      pending: "Getting comic... 🤔",
      error: "Error while fetching comic 😅",
      onError(error) {
        console.error("Error while fetching xkcd comic:", error);
      },
    },
    async () => {
      const text = ctx.match;

      const comic = await getXkcdUsecase({
        text,
        xkcdRepository: new XkcdRepository(ctx.apis),
      });

      const { image, caption } = createXkcdResponse(comic);

      await ctx.replyWithPhoto(image, {
        caption: ctx.renderReactText(caption),
        parse_mode: "HTML",
        reply_to_message_id: ctx.message?.message_id,
      });
    },
  );
}

export async function toggleXkcdSubscriptionHandler(
  ctx: CommandContext<AppContextType>,
) {
  const result = await ctx.sessionManager.toggleXkcdSubscription();
  if (!result) {
    await ctx.reply("You have unsubscribed from XKCD updates.");
  } else {
    await ctx.reply("You have subscribed to XKCD updates.");
  }
}
