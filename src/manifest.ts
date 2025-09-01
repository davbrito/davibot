import type { CommandConfig } from "$infrastructure/commands.ts";

export interface CommandRestrictions {
  allowed_users?: string[];
}

type SetupFunction<T> = () => Promise<T> | T;

export interface Restrictions {
  commands: Record<string, CommandRestrictions>;
}

interface CommandModule {
  config: CommandConfig;
}

export interface ManifestSchema {
  author: string;
  commands: {
    [key: string]: SetupFunction<CommandModule>;
  };
  restrictions?: Restrictions;
}

export async function resolveCommandConfig<T extends CommandModule>(
  command: SetupFunction<T> | T,
): Promise<T> {
  if (typeof command === "function") {
    return await command();
  }

  return command;
}
