import { denoPlugins } from "@luca/esbuild-deno-loader";
import { fromFileUrl } from "@std/path";
import * as esbuild from "esbuild";
import denoConfig from "../deno.json" with { type: "json" };
import { z } from "zod";
import { env } from "../lib/env.ts";
import { parseArgs } from "@std/cli/parse-args";

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

const result = await esbuild.build({
  entryPoints: [entry],
  format: "esm",
  target: "deno2.4",
  outdir: outdi,
  plugins: [
    ...(denoPlugins({
      configPath: fromFileUrl(import.meta.resolve("../deno.json")),
    }) as esbuild.Plugin[]),
  ],
  jsx: "automatic",
  jsxImportSource: denoConfig.compilerOptions.jsxImportSource,
  bundle: true,
  minify: minify,
  sourcemap: true,
  treeShaking: true,
  metafile: true,
});

await Deno.writeTextFile(
  fromFileUrl(import.meta.resolve("../dist/metafile.json")),
  JSON.stringify(result.metafile, null, 2),
);

esbuild.stop();
