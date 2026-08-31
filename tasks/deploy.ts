import "dotenv/config";
import { spawnSync } from "node:child_process";

import { z } from "zod";

import { env } from "../lib/env.ts";

const { DENO_DEPLOY_TOKEN, DENO_DEPLOY_PROJECT } = env({
  DENO_DEPLOY_TOKEN: z.string().min(1),
  DENO_DEPLOY_PROJECT: z.string().min(1),
});

const command = spawnSync(
  "deployctl",
  [
    "deploy",
    "--prod",
    `--project=${DENO_DEPLOY_PROJECT}`,
    `--token=${DENO_DEPLOY_TOKEN}`,
  ],
  {
    stdio: "inherit",
  },
);

const { status, error } = command;

if (error) {
  console.error(`deployctl exited with code ${status}`);
  process.exit(status);
}

process.exit(0);
