import { CommandConfig } from "../commands.ts";
import { parseArgs } from "@std/cli";

export const config: CommandConfig = {
  command: "qr",
  description: "Generates a QR code from the given text",
  setup: (bot) => {
    bot.command("qr", async (ctx) => {
      const text = ctx.match;
      console.log("match", text);

      if (!text) {
        await ctx.reply("Please provide some text to generate a QR code from");
        return;
      }

      const options = getOptions(text);

      const inputValue = String(options._[0]);

      const qrCodeUrl = getQrUrl(inputValue, options);

      const msg_id = ctx.message?.message_id;

      const imageFormats = ["png", "jpg", "webp", "gif"];
      const knownFormats = [...imageFormats, "svg", "eps"];

      if (!knownFormats.includes(options.format)) {
        await ctx.reply(
          `Formato desconhecido. Formatos suportados: ${knownFormats.join(
            ", "
          )}`,
          { reply_to_message_id: msg_id }
        );
      } else if (!imageFormats.includes(options.format)) {
        const linkEmoji = String.fromCodePoint(0x1f517);
        await ctx.reply(`${linkEmoji} ${qrCodeUrl}`, {
          reply_to_message_id: msg_id,
        });
      } else {
        await ctx.replyWithPhoto(qrCodeUrl, { reply_to_message_id: msg_id });
      }
    });
  },
};

function getOptions(text: string) {
  return parseArgs(parseToArgv(text), {
    string: ["color", "bgcolor", "format"],
    alias: {
      m: "margin",
      c: "color",
      b: "bgcolor",
      f: "format",
    },
    default: {
      format: "png",
    },
  });
}

type QrOptions = ReturnType<typeof getOptions>;

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
      console.log('matchQuote "', arg);
      result.push(matchQuote('"', argv, pos, arg));
    } else if (arg[0] === "'") {
      console.log("matchQuote '", arg);
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
