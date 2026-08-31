import { createClient, type UserConfig } from "@hey-api/openapi-ts";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { projectRoot } from "./constants.ts";

export async function generateApis() {
  const apis = {
    xkcd: {
      schema:
        "https://gist.githubusercontent.com/roaldnefs/053e505b2b7a807290908fe9aa3e1f00/raw/0a212622ebfef501163f91e23803552411ed00e4/openapi.yaml",
      baseUrl: "https://xkcd.com",
    },
  };

  const apisDir = path.join(projectRoot, "apis.gen");
  await fs.mkdir(apisDir, { recursive: true });

  await createClient(
    Object.entries(apis).map(([name, { schema: url }]): UserConfig => ({
      input: url,
      output: {
        path: path.join(apisDir, name),
        module: {
          extension: ".ts",
        },
      },
      plugins: [
        { name: "@hey-api/sdk", validator: "zod" },
        { name: "@hey-api/client-fetch" },
        { name: "zod" },
      ],
    })),
  );
}
