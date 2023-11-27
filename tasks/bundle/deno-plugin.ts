import { parseMediaType } from "@std/media-types";
import { fromFileUrl, toFileUrl } from "@std/path";
import * as esbuild from "esbuild";
import {
  ImportMap,
  resolveImportMap,
  resolveModuleSpecifier,
} from "https://deno.land/x/importmap@0.2.1/mod.ts";

const HTTP_REGEX = /^https?:/;
export function denoPlugin({
  importMap,
  baseUrl,
}: {
  importMap: ImportMap;
  baseUrl: URL;
}): esbuild.Plugin {
  return {
    name: "deno-resolver",
    setup(build) {
      build.onStart(() => {
        importMap = resolveImportMap(
          {
            imports: importMap.imports,
            scopes: importMap.scopes,
          },
          baseUrl
        );
      });

      build.onResolve({ filter: /^.*$/ }, function onResolve(args) {
        if (args.kind !== "import-statement") {
          return { path: args.path };
        }
        if (args.path.includes("@octokit/auth-token")) {
          console.log("npm:", args);
        }
        const importerUrl = !args.importer.match(HTTP_REGEX)
          ? toFileUrl(args.importer)
          : new URL(args.importer);

        const resolved = resolveModuleSpecifier(
          args.path,
          importMap,
          importerUrl
        );

        const schema = resolved.slice(0, resolved.indexOf(":") + 1);

        if (schema === "node:" || schema === "npm:" || schema === "jsr:") {
          return { external: true, path: resolved };
        }

        if (schema === "file:") {
          return { path: fromFileUrl(resolved) };
        }

        return { path: resolved, namespace: "deno" };
      });

      build.onLoad(
        { filter: /^https?:\/\/.*$/, namespace: "deno" },
        async ({ path }) => {
          const response = await fetch(path);
          if (!response.ok) {
            throw new Error(
              `Failed to fetch ${path}: ${response.status} ${response.statusText}`
            );
          }

          const [contentType] = parseMediaType(
            response.headers.get("content-type") ?? ""
          );
          const contents = await response.arrayBuffer();

          return {
            contents: new Uint8Array(contents),
            loader: loaders[contentType],
          };
        }
      );
    },
  };
}

const loaders: Record<string, esbuild.Loader> = {
  "application/javascript": "js",
  "application/json": "json",
  "application/typescript": "ts",
  "text/css": "css",
  "text/html": "text",
  "text/plain": "text",
};
