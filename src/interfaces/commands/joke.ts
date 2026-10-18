import type { CommandConfig } from "$infrastructure/commands.ts";

import { jokeCommandHandler } from "../handlers/joke.handler.ts";

export const config: CommandConfig = {
  name: "joke",
  description: "Tell a joke",
  setup(composer) {
    composer.command("joke", jokeCommandHandler);
    composer.hears(/chiste|joke/i, jokeCommandHandler);
  },
};
