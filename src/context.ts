import type { DbFlavor } from "$infrastructure/kv/middleware.ts";
import type { HydrateFlavor } from "@grammyjs/hydrate/plugin.ts";
import { Context } from "grammy";
import { ApisFlavor } from "$interfaces/middlewares/api.middleware.ts";
import { ReactFlavor } from "$interfaces/middlewares/react.middleware.tsx";
import { SessionManagerFlavor } from "./session/sessions.ts";

interface BaseAppContextType
  extends Context,
    SessionManagerFlavor,
    ReactFlavor,
    ApisFlavor,
    DbFlavor {}

export type AppContextType = HydrateFlavor<BaseAppContextType>;
