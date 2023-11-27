import { Context, MiddlewareFn } from "grammy";
import { DbContext } from "./dbcontext.ts";

export interface DbFlavor {
  db: DbContext;
}

export function withDb<C extends Context>(): MiddlewareFn<C & DbFlavor> {
  return (ctx, next) => {
    ctx.db = new DbContext();
    return next();
  };
}
