import { CommandConfig } from "$infrastructure/commands.ts";
import codeCommandHandler from "../handlers/code.handler.tsx";

export const config: CommandConfig = {
  name: "code",
  description: "Show code",
  command: codeCommandHandler,
};
