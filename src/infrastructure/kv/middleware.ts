import type { Context, MiddlewareFn } from "grammy";

import { DbContext } from "./dbcontext.ts";

export interface DbFlavor {
  db: DbContext;
}

export function withDb<C extends Context>(): MiddlewareFn<C & DbFlavor> {
  return async (ctx, next) => {
    using db = await DbContext.connect();
    ctx.db = db;
    return await next();
  };
}
