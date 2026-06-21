import { parseArgs } from "@std/cli/parse-args";
import { fromFileUrl } from "@std/path";
import { z } from "zod";
import { env } from "../lib/env.ts";

const { MINIFY } = env({
  MINIFY: z.stringbool().default(true),
});

const { minify } = parseArgs(Deno.args, {
  boolean: ["minify"],
  default: {
    minify: MINIFY,
  },
});

const entry = import.meta.resolve("../src/main.tsx");
const outdi = fromFileUrl(import.meta.resolve("../dist/"));

const result = await Deno.bundle({
  entrypoints: [entry],
  outputDir: outdi,
  minify: minify,
  sourcemap: "inline",
  platform: "deno",
  codeSplitting: true,
});

if (!result.success) {
  console.error("Bundle failed with errors:");
  for (const error of result.errors) {
    console.error(error);
  }
  Deno.exit(1);
}
