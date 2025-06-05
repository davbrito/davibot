import type { CommandConfig } from "../commands.ts";

export const config: CommandConfig = {
  command: "joke",
  description: "Tell a joke",
  compose(composer) {
    composer.command("joke", async (ctx) => {
      const joke = await fetchJoke();
      await ctx.reply(joke);
    });

    composer.hears(/chiste|joke/i, async (ctx) => {
      const joke = await fetchJoke();
      await ctx.reply(joke, { reply_to_message_id: ctx.message?.message_id });
    });
  },
};

async function fetchJoke() {
  const response = await fetch("https://icanhazdadjoke.com/", {
    headers: {
      Accept: "text/plain",
    },
  });
  return response.text();
}
