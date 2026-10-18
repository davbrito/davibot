import { getApi } from "$infrastructure/bot.ts";
import { notifyAdmin } from "$infrastructure/helpers/notify-admin.ts";

import { dailyXkcdJobHandler } from "./handlers.ts";

// daily at 9 AM Venezuela timezone (-4 UTC)
Deno.cron("send daily xkcd", "0 13 * * *", async () => {
  try {
    await dailyXkcdJobHandler();
  } catch (error) {
    console.error("Scheduled job failed:", error);
    await notifyAdmin(getApi(), "scheduled job", error);
  }
}); // Adjusted to UTC
