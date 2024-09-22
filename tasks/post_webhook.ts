import { load } from "@std/dotenv";
import { assert } from "@std/assert";
import { parseArgs, promptSecret } from "@std/cli";

await load({
  envPath: Deno.env.get("ENV") ? `.env.${Deno.env.get("ENV")}` : ".env",
  export: true,
});

const options = parseArgs(Deno.args, {
  string: ["url", "secret", "token"],
  alias: {
    u: "url",
    s: "secret",
    t: "token",
  },
  default: {
    url: Deno.env.get("WEBHOOK_URL"),
    secret: Deno.env.get("BOT_SECRET"),
    token: Deno.env.get("BOT_TOKEN"),
  },
});

const [action] = options._;

const BOT_TOKEN =
  options.token || promptSecret("Enter bot token: ", { mask: "" });
const baseUrl = new URL("https://api.telegram.org/bot" + BOT_TOKEN + "/");
const setWebhookUrl = new URL("setWebhook", baseUrl);

assert(BOT_TOKEN, "BOT_TOKEN is not set");

const actions = {
  delete() {
    return fetch(setWebhookUrl, { method: "POST" });
  },
  set() {
    const url = new URL(setWebhookUrl);
    const webhookUrl = options.url || prompt("Enter webhook url: ");
    const secret =
      options.secret || promptSecret("Enter secret token: ", { mask: "" });
    assert(webhookUrl, "webhook url is not set");
    assert(secret, "secret token is not set");
    url.searchParams.set("url", webhookUrl);
    url.searchParams.set("secret_token", secret);
    return fetch(url, { method: "POST" });
  },
  get() {
    const url = new URL("./getWebhookInfo", baseUrl);
    console.log(url.href);
    return fetch(url);
  },
};

const handler = actions[action as keyof typeof actions];

if (!handler) {
  console.log(
    "Usage: deno run --allow-net --allow-read --allow-env webhook.ts [action]\n" +
      "Actions: delete, set, get",
  );
  Deno.exit(1);
}

const response = await handler();
const json = await response.json();

console.log(json);
