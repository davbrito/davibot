import * as fs from "node:fs";
import * as path from "node:path";

import { createClient } from "@hey-api/openapi-ts";

import { projectRoot } from "./constants.ts";

export async function generateApis() {
  const xkcdSchemaUrl =
    "https://gist.githubusercontent.com/roaldnefs/053e505b2b7a807290908fe9aa3e1f00/raw/0a212622ebfef501163f91e23803552411ed00e4/openapi.yaml";

  const apis = {
    xkcd: { schema: xkcdSchemaUrl, baseUrl: "https://xkcd.com" },
  };

  const apisDir = path.join(projectRoot, "apis.gen");
  await fs.promises.mkdir(apisDir, { recursive: true });

  await createClient(
    Object.entries(apis).map(([name, { schema: url }]) => ({
      input: url,
      output: {
        path: path.join(apisDir, name),
        module: {
          extension: ".ts",
        },
      },
      plugins: [
        { name: "@hey-api/sdk", validator: "zod" },
        { name: "@hey-api/client-fetch", validator: "zod" },
        { name: "zod" },
      ],
    })),
  );
}
