import { load } from "@std/dotenv";
import * as fs from "@std/fs";
import * as path from "@std/path";
import { z } from "zod";
import { generateApis } from "./apis.ts";
import { manifestPath, sourcePath } from "./constants.ts";
import { formatCode } from "./utils.ts";

const dotenv = await load().then((e) =>
  z
    .object({
      AUTHOR: z.string(),
      RESTRICTIONS: z.string().optional(),
    })
    .parse({
      ...e,
      ...Deno.env.toObject(),
    })
);

async function createConfigsManifest(): Promise<string> {
  const COMMAND_FILE_REGEX = /\.tsx?$/;
  const commandsPath = path.join(sourcePath, "commands");

  const commandFilenames: string[] = [];

  for await (const file of Deno.readDir(commandsPath)) {
    if (file.isFile && COMMAND_FILE_REGEX.test(file.name)) {
      commandFilenames.push(file.name);
    }
  }

  const commandEntries: string[] = [];

  for (const commandPath of commandFilenames) {
    const key = path.basename(commandPath).replace(/\.[^/.]+$/, "");
    const commandValue = `_lazy(() => import("./src/commands/${commandPath}"))`;
    commandEntries.push(`"${key}": ${commandValue}`);
  }

  return `
    import type { ManifestSchema, Restrictions } from "./src/manifest.ts";

    const restrictions: Restrictions | undefined = ${await getRestrictions()};
    
    const manifest = {
        author: ${JSON.stringify(dotenv.AUTHOR)},
        commands: {
            ${commandEntries.join(",\n")}
        },
        restrictions
    } satisfies ManifestSchema;

    export default manifest;

    function _lazy<T>(fn: () => Promise<T>): () => T | Promise<T> {
      let cache: T | undefined;

      return () => (cache ?? (fn().then((result) => {
        cache = result;
        return result;
      })));
    }
  `;
}

async function getRestrictions() {
  try {
    let json;

    if (dotenv.RESTRICTIONS) {
      json = dotenv.RESTRICTIONS;
    } else {
      json = await Deno.readTextFile(
        new URL("../restrictions.json", import.meta.url),
      );
    }

    return JSON.stringify(JSON.parse(json));
  } catch {
    return "undefined";
  }
}

addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled rejection:", event.reason);
});

if (import.meta.main) {
  await Promise.all([generateManifestFile(), generateApis()]);
}

async function generateManifestFile(): Promise<void> {
  await fs.ensureFile(manifestPath);
  const code = await createConfigsManifest();
  return await Deno.writeFile(manifestPath, formatCode(code), { create: true });
}
