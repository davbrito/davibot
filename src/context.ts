import type { HydrateFlavor } from "@grammyjs/hydrate/plugin.ts";
import { Context } from "grammy";
import { DbFlavor } from "./kv/middleware.ts";
import { ApisFlavor } from "./middlewares/apis.ts";
import { ReactFlavor } from "./react.tsx";
import { SessionManagerFlavor } from "./session/sessions.ts";

interface BaseAppContextType
  extends Context,
    SessionManagerFlavor,
    ReactFlavor,
    ApisFlavor,
    DbFlavor {}

export type AppContextType = HydrateFlavor<BaseAppContextType>;
