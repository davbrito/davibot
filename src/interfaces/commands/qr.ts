import type { CommandConfig } from "$infrastructure/commands.ts";

import { qrCommandHandler } from "../handlers/qr.handler.ts";

export const config: CommandConfig = {
  name: "qr",
  description: "Generates a QR code from the given text",
  command: qrCommandHandler,
};
