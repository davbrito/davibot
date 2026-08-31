import { load } from "@std/dotenv";
import * as fs from "@std/fs";
import * as path from "@std/path";
import * as iasync from "iteretijs/async";
import { z } from "zod";
import denoJson from "../deno.json" with { type: "json" };
import { env } from "../lib/env.ts";
import { generateApis } from "./apis.ts";
import { manifestPath, sourcePath } from "./constants.ts";
import { formatCode } from "./utils.ts";

const dotenv = env(
  {
    RESTRICTIONS: z.string().optional(),
  },
  {
    ...(await load()),
    ...Deno.env.toObject(),
  },
);

async function createConfigsManifest(): Promise<string> {
  const commandsPath = path.join(sourcePath, "interfaces", "commands");

  const commandFilenames = await Array.fromAsync(
    iasync.map(
      iasync.concat(
        fs.expandGlob("*.{ts,tsx}", {
          root: commandsPath,
          includeDirs: false,
        }),
        fs.expandGlob("*/index.{ts,tsx}", {
          root: commandsPath,
          includeDirs: false,
        }),
      ),
      (x) => path.relative(commandsPath, x.path),
    ),
  );

  const commandEntries: string[] = [];

  for (const commandPath of commandFilenames) {
    const stem = path.basename(commandPath, path.extname(commandPath));
    const commandName = stem === "index" ? path.dirname(commandPath) : stem;
    const commandPathNormalized = commandPath.replace(path.SEPARATOR, "/");
    const commandValue = `() => import("$interfaces/commands/${commandPathNormalized}")`;
    commandEntries.push(`"${commandName}": ${commandValue}`);
  }

  const buildMetadata = {
    version: denoJson.version ?? "unknown",
    timestamp: new Date().toISOString(),
  };

  return `
    import type { ManifestSchema, Restrictions } from "./src/manifest.ts";

    const restrictions: Restrictions | undefined = ${await getRestrictions()};

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
