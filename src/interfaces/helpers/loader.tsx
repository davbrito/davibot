import type { AppContextType } from "../../context.ts";
import { codeBlock } from "./markdown.ts";

export async function loaderMessage(
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

  const updateMessage = async (message: string, md?: boolean) => {
    if (!messagePromise) {
      messagePromise = ctx.reply(message, {
        parse_mode: md ? "MarkdownV2" : undefined,
      });
      await messagePromise;
      return;
    }

    const msg = await messagePromise;
    await msg.editText(message, {
      parse_mode: md ? "MarkdownV2" : undefined,
    });
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
    let message = error;

    if (ctx.isOwner) {
      message += `\n\n${codeBlock(String(exc))}`;
      await updateMessage(message, true);
    } else {
      await updateMessage(message);
    }
  }
}
