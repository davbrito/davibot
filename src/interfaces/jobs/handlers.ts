import { getXkcdUsecase } from "$application/usecases/get-xkcd.usecase.ts";
import { getExternalApis } from "$infrastructure/adapters/api.adapter.ts";
import { getBot } from "$infrastructure/bot.ts";
import { notifyAdmin } from "$infrastructure/helpers/notify-admin.ts";
import { DbContext } from "$infrastructure/kv/dbcontext.ts";
import { XkcdRepository } from "$infrastructure/repositories/xkcd.repository.ts";
import { renderToStaticMarkup } from "react-dom/server";
import { createXkcdResponse } from "../helpers/xkcd-response.helper.tsx";

export async function dailyXkcdJobHandler() {
  const bot = getBot();

  try {
    const apis = getExternalApis();
    using db = await DbContext.connect();
    const xkcdRepository = new XkcdRepository(apis);

    const comic = await getXkcdUsecase({ text: "current", xkcdRepository });
    const response = createXkcdResponse(comic);

    let count = 0;

    for await (const chatId of db.xkcdSubscription.getSubscribedChatIds()) {
      await bot.api.sendPhoto(String(chatId), response.image, {
        caption: renderToStaticMarkup(response.caption),
        parse_mode: "HTML",
      });
      count++;
    }

    console.log(`Sent ${count} XKCD updates.`);
  } catch (error) {
    console.error("Error running dailyXkcdJobHandler:", error);
    await notifyAdmin(bot.api, "dailyXkcdJobHandler", error);
  }
}
