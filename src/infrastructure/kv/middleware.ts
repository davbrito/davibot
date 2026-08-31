import type { Context, MiddlewareFn } from "grammy";

import { DbContext } from "./dbcontext.ts";

export type DbFlavor<C extends Context> = C & {
  db: DbContext;
};

export function withDb<C extends Context>(): MiddlewareFn<DbFlavor<C>> {
  return async (ctx, next) => {
    using db = await DbContext.connect();
    ctx.db = db;
    return await next();
  };
}
