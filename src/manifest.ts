import type { CommandConfig } from "$infrastructure/commands.ts";

export interface CommandRestrictions {
  allowed_users?: string[];
}

type SetupFunction<T> = () => Promise<T> | T;

export interface Restrictions {
  commands: Record<string, CommandRestrictions>;
}

interface CommandModule {
  config: CommandConfig | CommandConfig[];
}

export interface ManifestSchema {
  author: string;
  commands: {
    [key: string]: SetupFunction<CommandModule>;
  };
  restrictions?: Restrictions;
  buildMetadata?: Record<string, unknown>;
}

export async function resolveCommandConfig(
  command: SetupFunction<CommandModule> | CommandModule,
): Promise<CommandModule> {
  if (typeof command === "function") {
    return await command();
  }

  return command;
}
