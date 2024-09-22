import importMap from "../deno.json" with { type: "json" };
import * as path from "@std/path";

export const projectRoot = path.dirname(
  path.dirname(path.fromFileUrl(import.meta.url)),
);
export const sourcePath = path.join(projectRoot, "src");
export const manifestPath = path.resolve(
  projectRoot,
  importMap.imports.$manifest,
);
