import "@std/dotenv/load";
import { z } from "zod";

const { DENO_DEPLOY_TOKEN, DENO_DEPLOY_PROJECT } = z
  .object({
    DENO_DEPLOY_TOKEN: z.string().min(1),
    DENO_DEPLOY_PROJECT: z.string().min(1),
  })
  .parse(Deno.env.toObject());

const command = new Deno.Command("deployctl", {
  args: [
    "deploy",
    "--prod",
    `--project=${DENO_DEPLOY_PROJECT}`,
    `--token=${DENO_DEPLOY_TOKEN}`,
  ],
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

const { success, code } = await command.spawn().status;

if (!success) {
  console.error(`deployctl exited with code ${code}`);
  Deno.exit(code);
}

Deno.exit(0);
