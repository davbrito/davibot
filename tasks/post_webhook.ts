import "dotenv/config";
import assert from "node:assert";

import { confirm, input, password } from "@inquirer/prompts";
import colors from "chalk";
import { Command } from "commander";
import { Api } from "grammy";

let api: Api;

const program = new Command()
  .option("-u, --url <url>", "Webhook URL")
  .option("-s, --secret <secret>", "Secret token for webhook")
  .option("-t, --token <token>", "Telegram bot token")
  .option("-e, --read-env", "Read options from environment variables")
  .option("-d, --debug", "Enable debug mode with sensitive logs")
  .hook("preAction", async (program) => {
    const token = await requireBotToken();
    api = new Api(token, { sensitiveLogs: !!program.getOptionValue("debug") });
  });

program
  .command("delete")
  .description("Delete the existing webhook")
  .action(async () => {
    if (!(await confirmAction())) {
      console.log(colors.yellow("Action canceled."));
      return;
    }

    await api.deleteWebhook();
  });

program
  .command("set")
  .description("Set a new webhook")
  .action(async () => {
    const webhookUrl = await requireWebhookUrl();
    const secret = await requireSecretToken();

    if (!(await confirmAction())) {
      console.log(colors.yellow("Action canceled."));
      return;
    }

    const ok = await api.setWebhook(webhookUrl, { secret_token: secret });
    if (ok) {
      console.log(colors.green("Webhook set successfully."));
    } else {
      console.error(colors.red("Failed to set webhook."));
    }
  });

program
  .command("get")
  .description("Get current webhook info")
  .action(async () => {
    const info = await api.getWebhookInfo();
    console.log("Current webhook info:", info);
  });

program.on("option:read-env", function () {
  const ops = program.opts();
  if (!ops.readEnv) return;
  console.log(colors.dim("Reading options from environment variables..."));

  if (!ops.url && process.env.WEBHOOK_URL) {
    program.setOptionValue("url", process.env.WEBHOOK_URL);
    console.log(colors.dim("Using WEBHOOK_URL from environment variables"));
  }

  if (!ops.secret && process.env.BOT_SECRET) {
    program.setOptionValue("secret", process.env.BOT_SECRET);
    console.log(colors.dim("Using BOT_SECRET from environment variables"));
  }

  if (!ops.token && process.env.BOT_TOKEN) {
    program.setOptionValue("token", process.env.BOT_TOKEN);
    console.log(colors.dim("Using BOT_TOKEN from environment variables"));
  }
});

await program.parseAsync();

async function confirmAction(): Promise<boolean> {
  console.log("Getting bot info...");
  const botInfo = await api.getMe();
  console.log(
    `You are about to modify the webhook for bot: ${botInfo.username}`,
  );
  const confirmation = await confirm({ message: "Are you sure?" });
  return confirmation;
}

async function requireBotToken() {
  const value =
    program.opts().token ||
    (await password({ message: "Enter bot token: ", mask: "" }));
  assert(value, "BOT_TOKEN is not set");
  return value;
}

async function requireSecretToken() {
  const value =
    program.opts().secret ||
    (await password({ message: "Enter secret token: ", mask: "" }));
  assert(value, "BOT_SECRET is not set");
  return value;
}

async function requireWebhookUrl() {
  const value =
    program.opts().url ||
    (await input({ message: "Enter webhook url: ", required: true }));
  assert(value, "WEBHOOK_URL is not set");
  return value;
}
