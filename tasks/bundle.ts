import { denoPlugins } from "@luca/esbuild-deno-loader";
import { fromFileUrl } from "@std/path";
import * as esbuild from "esbuild";
import denoConfig from "../deno.json" with { type: "json" };
import { z } from "zod";

const { MINIFY } = z.object({
  MINIFY: z.stringbool().default(true),
}).parse(
  Deno.env.toObject(),
);

const entry = fromFileUrl(import.meta.resolve("../src/main.tsx"));
const outdi = fromFileUrl(import.meta.resolve("../dist/"));

const result = await esbuild.build({
  entryPoints: [entry],
  format: "esm",
  target: "deno2.3",
  outdir: outdi,
  plugins: [
    ...denoPlugins({
      configPath: fromFileUrl(import.meta.resolve("../deno.json")),
    }),
  ],
  jsx: "automatic",
  jsxImportSource: denoConfig.compilerOptions.jsxImportSource,
  bundle: true,
  minify: MINIFY,
  sourcemap: true,
  treeShaking: true,
  metafile: true,
});

await Deno.writeTextFile(
  fromFileUrl(import.meta.resolve("../dist/metafile.json")),
  JSON.stringify(result.metafile, null, 2),
);
