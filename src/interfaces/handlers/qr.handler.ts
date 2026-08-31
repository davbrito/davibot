import { Command } from "commander";
import type { CommandContext } from "grammy";

import type { AppContextType } from "../../context.ts";

export async function qrCommandHandler(ctx: CommandContext<AppContextType>) {
  const text = ctx.match;

  if (!text) {
    await ctx.reply("Please provide some text to generate a QR code from");
    return;
  }

  const { options, inputValue } = qrCommand(text);

  const qrCodeUrl = getQrUrl(inputValue, options);

  const msg_id = ctx.message?.message_id;

  const imageFormats = ["png", "jpg", "webp", "gif"];
  const knownFormats = [...imageFormats, "svg", "eps"];

  if (!knownFormats.includes(options.format)) {
    await ctx.reply(
      `Formato desconhecido. Formatos suportados: ${knownFormats.join(", ")}`,
      { reply_to_message_id: msg_id },
    );
  } else if (!imageFormats.includes(options.format)) {
    const linkEmoji = String.fromCodePoint(0x1f517);
    await ctx.reply(`${linkEmoji} ${qrCodeUrl}`, {
      reply_to_message_id: msg_id,
    });
  } else {
    await ctx.replyWithPhoto(qrCodeUrl, { reply_to_message_id: msg_id });
  }
}

function qrCommand(text: string) {
  const argv = parseToArgv(text);
  const command = new Command()
    .option("-m, --margin <number>", "Margin around the QR code")
    .option("-c, --color <hex>", "Color of the QR code in hex format")
    .option(
      "-b, --bgcolor <hex>",
      "Background color of the QR code in hex format",
    )
    .option(
      "-f, --format <format>",
      "Image format (png, jpg, webp, gif, svg, eps)",
      "png",
    )
    .argument("<value>", "Value to encode in the QR code")
    .parse(argv, { from: "user" });

  const options = command.opts();
  const [inputValue] = command.processedArgs;

  return { options, inputValue };
}

type QrOptions = ReturnType<typeof qrCommand>["options"];

function getQrUrl(value: string, options: QrOptions): string {
  const searchParams = new URLSearchParams({
    data: value,
    size: "512x512",
    margin: String(options.margin || "20"),
    format: options.format || "png",
  });

  if (options.color) searchParams.set("color", options.color);
  if (options.bgcolor) searchParams.set("bgcolor", options.bgcolor);

  return (
    "https://api.qrserver.com/v1/create-qr-code/?" + searchParams.toString()
  );
}

function parseToArgv(text: string): string[] {
  const argv = text.split(" ").filter(Boolean);
  const result: string[] = [];
  let pos = 0;

  while (argv.length) {
    const arg = argv.shift()!;
    if (arg[0] === '"') {
      result.push(matchQuote('"', argv, pos, arg));
    } else if (arg[0] === "'") {
      result.push(matchQuote("'", argv, pos, arg));
    } else {
      result.push(arg);
    }

    pos += arg.length;
  }

  return result;
}

function matchQuote(char: string, argv: string[], pos: number, arg: string) {
  while (argv.length) {
    const part = argv.shift()!;
    arg += " " + part;

    if (part.endsWith(char)) {
      return arg.slice(1, -1);
    }
  }

  throw new Error("Unmatched quotes at position " + pos);
}
