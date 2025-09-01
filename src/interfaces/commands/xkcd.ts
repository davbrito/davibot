import type { CommandConfig } from "$infrastructure/commands.ts";
import {
  xkcdCommandHandler,
  toggleXkcdSubscriptionHandler,
} from "../handlers/xkcd.handler.tsx";

export const config: CommandConfig[] = [
  {
    name: "xkcd",
    description: "Get a random xkcd comic",
    command: xkcdCommandHandler,
  },
  {
    name: "dailyxkcd",
    description: "Subscribe to daily xkcd comics",
    command: toggleXkcdSubscriptionHandler,
  },
];
