import type { DbFlavor } from "$infrastructure/kv/middleware.ts";
import type { ApisFlavor } from "$interfaces/middlewares/api.middleware.ts";
import type { ReactFlavor } from "$interfaces/middlewares/react.middleware.tsx";
import type { HydrateFlavor } from "@grammyjs/hydrate";
import type { Context } from "grammy";

import type { SessionManagerFlavor } from "./session/sessions.ts";

interface BaseAppContextType
  extends Context, SessionManagerFlavor, ReactFlavor, ApisFlavor, DbFlavor {
  isOwner: boolean;
  env: CloudflareBindings;
}

export type AppContextType = HydrateFlavor<BaseAppContextType>;
