import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { URL } from "node:url";

import { z } from "zod";

import { env } from "../lib/env.ts";
import packageJson from "../package.json" with { type: "json" };
import { generateApis } from "./apis.ts";
import { manifestPath, sourcePath } from "./constants.ts";
import { formatCode } from "./utils.ts";

const dotenv = env({
  RESTRICTIONS: z.string().optional(),
});

async function createConfigsManifest(): Promise<string> {
  const commandsPath = path.join(sourcePath, "interfaces", "commands");

  const commandFiles = fs.globSync(["*.{ts,tsx}", "*/index.{ts,tsx}"], {
    cwd: commandsPath,
  });

  const commandEntries: string[] = [];

  for (const commandPath of commandFiles) {
    const stem = path.basename(commandPath, path.extname(commandPath));
    const commandName = stem === "index" ? path.dirname(commandPath) : stem;
    const commandPathNormalized = commandPath.replace(path.sep, "/");
    const commandValue = `() => import("$interfaces/commands/${commandPathNormalized}")`;
    commandEntries.push(`"${commandName}": ${commandValue}`);
  }

  const buildMetadata = {
    version: packageJson.version ?? "unknown",
    timestamp: new Date().toISOString(),
  };

  return `
    import type { ManifestSchema, Restrictions } from "./src/manifest.ts";

    const restrictions: Restrictions | undefined = ${getRestrictions()};
    
    const manifest = {
        commands: {
            ${commandEntries.join(",\n")}
        },
        restrictions,
        buildMetadata: ${JSON.stringify(buildMetadata)}
    } satisfies ManifestSchema;

    export default manifest;
  `;
}

function getRestrictions() {
  try {
    let json;

    if (dotenv.RESTRICTIONS) {
      json = dotenv.RESTRICTIONS;
    } else {
      json = fs.readFileSync(new URL("../restrictions.json", import.meta.url), {
        encoding: "utf-8",
      });
    }

    return JSON.stringify(JSON.parse(json));
  } catch {
    return "undefined";
  }
}

if (import.meta.main) {
  await Promise.all([generateManifestFile(), generateApis()]);
}

async function generateManifestFile(): Promise<void> {
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  const code = await createConfigsManifest().then(formatCode);
  return fs.writeFileSync(manifestPath, code, {
    encoding: "utf-8",
  });
}
