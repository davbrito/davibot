import { CommandConfig } from "../commands.ts";

export const config: CommandConfig = {
  command: "xkcd",
  description: "Get a random xkcd comic",
  setup: (bot) => {
    const idRegex = /^\d+$/;
    bot.command("xkcd", async (ctx) => {
      let replyMsgPromise: ReturnType<typeof ctx.reply> | null = ctx.reply(
        "Getting comic... 🤔"
      );

      const replyError = async () => {
        const message = "Error while fetching comic 😅";

        if (!replyMsgPromise) {
          replyMsgPromise = ctx.reply(message, {
            reply_to_message_id: ctx.message?.message_id,
          });
          await replyMsgPromise;
          return;
        }

        const msg = await replyMsgPromise;
        await msg.editText(message);
      };

      const deleteReplyMsg = async () => {
        const replyMsg = await replyMsgPromise;

        if (replyMsg) {
          await replyMsg.delete();
          replyMsgPromise = null;
        }
      };

      try {
        const text = ctx.match;
        let res;
        const xkcd = ctx.apis.xkcd;

        if (text === "current") {
          res = await xkcd.getCurrentComic({});
        } else {
          const id = text.trim().match(idRegex)?.[0];
          if (id) {
            res = await xkcd.getComic({ id: Number(id) });
          } else {
            res = await xkcd.getRandomComic();
          }
        }

        if (!res.ok) {
          console.error(
            `Error while fetching xkcd comic: ${res.status} ${res.statusText}`
          );
          await replyError();
          return;
        }

        const comic = res.data;

        await Promise.all([
          deleteReplyMsg(),
          ctx.replyWithPhoto(comic.img!, {
            caption: ctx.renderReactText(
              <>
                <b>{comic.title}</b> {"\n"}
                {comic.alt}
                {"\n\n"}
                <a href={`https://xkcd.com/${comic.num}`}>
                  xkcd #{comic.num} ({comic.year}/{comic.month}/{comic.day})
                </a>
              </>
            ),
            parse_mode: "HTML",
            reply_to_message_id: ctx.message?.message_id,
          }),
        ]);
      } catch (error) {
        console.error("Error while fetching xkcd comic:", error);
        await replyError();
      }
    });
  },
};
