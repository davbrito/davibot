import importMap from "../deno.json" with { type: "json" };
import * as path from "node:path";
import * as url from "node:url";

export const projectRoot = path.dirname(
  path.dirname(url.fileURLToPath(import.meta.url)),
);
export const sourcePath = path.join(projectRoot, "src");
export const manifestPath = path.resolve(
  projectRoot,
  importMap.imports.$manifest,
);
