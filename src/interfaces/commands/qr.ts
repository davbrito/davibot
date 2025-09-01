import type { CommandConfig } from "$infrastructure/commands.ts";
import { qrCommandHandler } from "../handlers/qr.handler.ts";

export const config: CommandConfig = {
  command: "qr",
  description: "Generates a QR code from the given text",
  setup: (bot) => {
    bot.command("qr", qrCommandHandler);
  },
};
