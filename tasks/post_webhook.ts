import { assert } from "@std/assert";
import { parseArgs, promptSecret } from "@std/cli";
import { load } from "@std/dotenv";
import { Api } from "grammy";

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

const api = new Api(requireBotToken());

const actions = {
  async delete() {
    if (!(await confirmAction())) {
      console.log("Action canceled.");
      return;
    }
    return api.deleteWebhook();
  },
  async set() {
    const webhookUrl = requireWebhookUrl();
    const secret = requireSecretToken();

    if (!(await confirmAction())) {
      console.log("Action canceled.");
      return;
    }

    return api.setWebhook(webhookUrl, { secret_token: secret });
  },
  get() {
    return api.getWebhookInfo();
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

console.log(response);

async function confirmAction(): Promise<boolean> {
  console.log("Getting bot info...");
  const botInfo = await api.getMe();
  console.log(
    `You are about to modify the webhook for bot: ${botInfo.username}`,
  );
  const confirmation = prompt("Are you sure? (y/n)");
  return confirmation?.toLowerCase() === "y";
}

function requireBotToken() {
  const value =
    options.token || promptSecret("Enter bot token: ", { mask: "" });
  assert(value, "BOT_TOKEN is not set");
  return value;
}

function requireSecretToken() {
  const value =
    options.secret || promptSecret("Enter secret token: ", { mask: "" });
  assert(value, "BOT_SECRET is not set");
  return value;
}

function requireWebhookUrl() {
  const value = options.url || prompt("Enter webhook url: ");
  assert(value, "WEBHOOK_URL is not set");
  return value;
}
