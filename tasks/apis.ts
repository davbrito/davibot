import * as fs from "@std/fs";
import * as path from "@std/path";
import ts from "typescript";
import { projectRoot } from "./constants.ts";
import { formatCode } from "./utils.ts";
import { createClient, type UserConfig } from "@hey-api/openapi-ts";

function removeNeverProperties(node: ts.Node) {
  if (
    ts.isPropertySignature(node) &&
    node.type?.kind === ts.SyntaxKind.NeverKeyword
  ) {
    return [];
  }

  const result = ts.visitEachChild(node, removeNeverProperties, undefined);

  if (
    ts.isPropertySignature(result) &&
    result.type &&
    ts.isTypeLiteralNode(result.type) &&
    result.type.members.length === 0
  ) {
    return [];
  }

  return result;
}

export async function generateApis() {
  const xkcdSchemaUrl =
    "https://gist.githubusercontent.com/roaldnefs/053e505b2b7a807290908fe9aa3e1f00/raw/0a212622ebfef501163f91e23803552411ed00e4/openapi.yaml";

  const apis = {
    xkcd: { schema: xkcdSchemaUrl, baseUrl: "https://xkcd.com" },
  };

  const apisDir = path.join(projectRoot, "apis.gen");
  await fs.ensureDir(apisDir);

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
