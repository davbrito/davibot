import { program } from "commander";
import { fileURLToPath } from "node:url";
import * as z from "zod";
import { env } from "../lib/env.ts";

const { MINIFY } = env({
  MINIFY: z.stringbool().default(true),
});

program.option("--minify", "Enable minification", MINIFY);
program.parse();

const { minify } = program.opts<{ minify: boolean }>();

const entry = import.meta.resolve("../src/main.tsx");
const outdi = fileURLToPath(import.meta.resolve("../dist/"));

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
  process.exit(1);
}
