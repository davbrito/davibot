import { dailyXkcdJobHandler } from "./handlers.ts";

// daily at 9 AM Venezuela timezone (-4 UTC)
Deno.cron("send daily xkcd", "0 13 * * *", dailyXkcdJobHandler); // Adjusted to UTC
Deno.cron("send minutely xkcd", "* * * * *", dailyXkcdJobHandler);
