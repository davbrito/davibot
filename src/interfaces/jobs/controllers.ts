import { dailyXkcdJobHandler } from "./handlers.ts";

// daily
Deno.cron("send daily xkcd", "0 0 * * *", dailyXkcdJobHandler);
