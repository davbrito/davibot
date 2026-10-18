import { getApi } from "$infrastructure/bot.ts";
import { notifyAdmin } from "$infrastructure/helpers/notify-admin.ts";
import { DbContext, dbStorage } from "$infrastructure/kv/dbcontext.ts";
import { createKvStorage } from "$infrastructure/kv/storage.ts";

import { dailyXkcdJobHandler } from "./handlers.ts";

export const scheduled: ExportedHandlerScheduledHandler<
  CloudflareBindings
> = async (controller, env, ctx) => {
  try {
    switch (controller.cron) {
      // daily at 9 AM Venezuela timezone (-4 UTC)
      case "0 13 * * *": {
        const storage = createKvStorage(env.KV);
        const db = DbContext.connect(storage);
        await dbStorage.run(db, () => dailyXkcdJobHandler(db));
        return;
      }
      default:
        console.warn(`No handler for cron: ${controller.cron}`);
    }
  } catch (error) {
    console.error("Scheduled job failed:", error);
    ctx.waitUntil(
      notifyAdmin(getApi(), "scheduled job", error).catch(() => {}),
    );
  }
};
