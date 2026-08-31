import { load } from "@std/dotenv";
import fsNode from "node:fs/promises";
import pathNode from "node:path";
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
  const commandsPath = pathNode.join(sourcePath, "interfaces", "commands");

  const globResult = fsNode.glob(["*.{ts,tsx}", "*/index.{ts,tsx}"], {
    cwd: commandsPath,
    withFileTypes: true,
  });

  const commandEntries: string[] = [];

  for await (const entry of globResult) {
    if (!entry.isFile()) continue;
    const relativePath = pathNode.relative(
      commandsPath,
      pathNode.join(entry.parentPath, entry.name),
    );

    const stem = pathNode.basename(relativePath, pathNode.extname(relativePath));
    const commandName = stem === "index" ? pathNode.basename(entry.parentPath) : stem;
    const commandValue = `() => import("$interfaces/commands/${relativePath}")`;
    commandEntries.push(`"${commandName}": ${commandValue}`);
  }

  const buildMetadata = {
    version: denoJson.version ?? "unknown",
    timestamp: new Date().toISOString(),
  };

  const restrictions = await getRestrictions();
  return `
    import type { ManifestSchema, Restrictions } from "./src/manifest.ts";

    const restrictions: Restrictions | undefined = ${restrictions};

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
    let json: string;

    if (dotenv.RESTRICTIONS) {
      json = dotenv.RESTRICTIONS;
    } else {
      json = await fsNode.readFile(
        new URL("../restrictions.json", import.meta.url),
        { encoding: "utf-8" },
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
  const code = await createConfigsManifest();
  const formatStream = formatCode(code);
  return await Deno.writeFile(manifestPath, formatStream, { create: true });
}
