import { CommandConfig } from "./commands.ts";

export interface CommandRestrictions {
  allowed_users?: string[];
}

export interface Restrictions {
  commands: Record<string, CommandRestrictions>;
}

export interface ManifestSchema {
  author: string;
  commands: {
    [key: string]: {
      config: CommandConfig;
    };
  };
  restrictions?: Restrictions;
}
