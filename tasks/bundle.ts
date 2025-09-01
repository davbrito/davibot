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

const args = [
  "bundle",
  "-I",
  "--outdir",
  outdi,
  "--format=esm",
  "--config",
  fromFileUrl(import.meta.resolve("../deno.json")),
  "--sourcemap",
  // "--code-splitting",
  entry,
];

if (minify) {
  args.push("--minify");
}

await new Deno.Command(Deno.execPath(), {
  args: args,
})
  .spawn()
  .output();
