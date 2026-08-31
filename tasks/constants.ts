import * as path from "node:path";
import * as url from "node:url";

export const projectRoot = path.dirname(
  path.dirname(url.fileURLToPath(import.meta.url)),
);
export const sourcePath = path.join(projectRoot, "src");
export const manifestPath = url.fileURLToPath(
  new url.URL("../manifest.gen.ts", import.meta.url),
);
