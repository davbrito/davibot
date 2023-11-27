import { fromFileUrl } from "@std/path";
import * as esbuild from "esbuild";
import denoConfig from "../deno.json" with { type: "json" };
import { denoPlugin } from "./bundle/deno-plugin.ts";

const entry = fromFileUrl(import.meta.resolve("../src/main.tsx"));
const outdi = fromFileUrl(import.meta.resolve("../dist/"));

const result = await esbuild.build({
  entryPoints: [entry],
  format: "esm",
  target: "deno1.46",
  outdir: outdi,
  plugins: [
    denoPlugin({
      importMap: denoConfig,
      baseUrl: new URL("../", import.meta.url),
    }),
  ],
  jsx: "automatic",
  jsxImportSource: denoConfig.compilerOptions.jsxImportSource,
  bundle: true,
  minify: true,
  sourcemap: true,
  treeShaking: true,
  metafile: true,
});

await Deno.writeTextFile(
  fromFileUrl(import.meta.resolve("../dist/metafile.json")),
  JSON.stringify(result.metafile, null, 2),
);
