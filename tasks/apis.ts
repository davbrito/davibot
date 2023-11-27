import * as fs from "@std/fs";
import * as path from "@std/path";
import openapiTS, { astToString } from "openapi-typescript";
import ts from "typescript";
import { projectRoot } from "./constants.ts";
import { formatCode } from "./utils.ts";

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

  for (const [name, { schema: url }] of Object.entries(apis)) {
    const code = await openapiTS(url).then((ast) => {
      ast = ast.map(removeNeverProperties).flat();

      return astToString(ast);
    });
    const filePath = path.join(apisDir, `${name}.ts`);
    const file = await Deno.open(filePath, {
      write: true,
      create: true,
      truncate: true,
    });
    await formatCode(code).pipeTo(file.writable);
  }

  const moduleCode = `
import { Fetcher } from 'openapi-typescript-fetch'; 
${Object.keys(apis).map((name) => `import * as ${name} from "./${name}.ts";`)}

${Object.entries(apis)
  .map(([name, { baseUrl }]) => {
    const fetcher = `${name}Fetcher`;
    const baseUrlName = `${name}BaseUrl`;
    return (
      `export const ${baseUrlName} = ${JSON.stringify(baseUrl)};\n` +
      `export const ${fetcher} = Fetcher.for<${name}.paths>();\n` +
      `${fetcher}.configure({ baseUrl: ${baseUrlName} });`
    );
  })
  .join("\n")}
`;

  const moduleFilePath = path.join(apisDir, "mod.ts");
  const moduleFile = await Deno.open(moduleFilePath, {
    write: true,
    create: true,
    truncate: true,
  });
  await formatCode(moduleCode).pipeTo(moduleFile.writable);
}
