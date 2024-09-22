import { Context, MiddlewareFn } from "grammy";
import { DbContext } from "./dbcontext.ts";

export interface DbFlavor {
  db: DbContext;
}

export function withDb<C extends Context>(): MiddlewareFn<C & DbFlavor> {
  return async (ctx, next) => {
    ctx.db = new DbContext();
    try {
      return await next();
    } finally {
      ctx.db[Symbol.dispose]();
    }
  };
}
