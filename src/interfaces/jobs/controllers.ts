import { getApi } from "$infrastructure/bot.ts";
import { notifyAdmin } from "$infrastructure/helpers/notify-admin.ts";
import { DbContext } from "$infrastructure/kv/dbcontext.ts";

import { dailyXkcdJobHandler } from "./handlers.ts";

// daily at 9 AM Venezuela timezone (-4 UTC)
Deno.cron("send daily xkcd", "0 13 * * *", async () => {
  try {
    using db = await DbContext.connect();
    await dailyXkcdJobHandler(db);
  } catch (error) {
    console.error("Scheduled job failed:", error);
    await notifyAdmin(getApi(), "scheduled job", error);
  }
}); // Adjusted to UTC
