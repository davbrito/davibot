import { AppContextType } from "../../context.ts";

export async function jokeCommandHandler(ctx: AppContextType) {
  const joke = await fetchJoke();
  await ctx.reply(joke);
}

async function fetchJoke() {
  const response = await fetch("https://icanhazdadjoke.com/", {
    headers: { Accept: "text/plain" },
  });
  return response.text();
}
