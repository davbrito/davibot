import { getApi } from "$infrastructure/bot.ts";
import { notifyAdmin } from "$infrastructure/helpers/notify-admin.ts";

import { dailyXkcdJobHandler } from "./handlers.ts";

export const scheduled: ExportedHandlerScheduledHandler<
  CloudflareBindings
> = async (controller, _env, ctx) => {
  try {
    switch (controller.cron) {
      // daily at 9 AM Venezuela timezone (-4 UTC)
      case "0 13 * * *":
        await dailyXkcdJobHandler();
        return;
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
