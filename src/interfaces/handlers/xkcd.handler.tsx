import { CommandContext } from "grammy";
import { AppContextType } from "../../context.ts";
import {
  comicSchema,
  createXkcdResponse,
} from "../helpers/xkcd-response.helper.tsx";

const idRegex = /^\d+$/;

async function loaderMessage(
  ctx: AppContextType,
  {
    pending,
    error,
    onError,
  }: {
    pending: string;
    error: string;
    onError: (error: unknown) => void;
  },
  cb: () => Promise<void>,
) {
  let messagePromise: ReturnType<typeof ctx.reply> | null = null;

  const updateMessage = async (message: string) => {
    if (!messagePromise) {
      messagePromise = ctx.reply(message);
      await messagePromise;
      return;
    }

    const msg = await messagePromise;
    await msg.editText(message);
  };

  const deleteMessage = async () => {
    if (messagePromise) {
      const msg = await messagePromise;
      await msg.delete();
    }
  };

  try {
    updateMessage(pending);
    await cb();
    deleteMessage();
  } catch (exc) {
    onError?.(exc);
    await updateMessage(error);
  }
}

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
      const res = await retrieveComic(ctx);
      if (!res.ok) {
        throw new Error(
          `Error fetching comic: ${res.status} ${res.statusText}`,
        );
      }

      const { image, caption } = createXkcdResponse(
        comicSchema.parse(res.data),
      );

      await ctx.replyWithPhoto(image, {
        caption: ctx.renderReactText(caption),
        parse_mode: "HTML",
        reply_to_message_id: ctx.message?.message_id,
      });
    },
  );
}

async function retrieveComic(ctx: CommandContext<AppContextType>) {
  const text = ctx.match;
  const xkcd = ctx.apis.xkcd;

  if (text === "current") {
    return await xkcd.getCurrentComic({});
  }

  const id = text.trim().match(idRegex)?.[0];

  if (id) {
    return await xkcd.getComic({ id: Number(id) });
  } else {
    return await xkcd.getRandomComic();
  }
}
