import {
  ExternalApis,
  getExternalApis,
} from "$infrastructure/adapters/api.adapter.ts";
import type { Context, MiddlewareFn } from "grammy";

export interface ApisFlavor {
  apis: ExternalApis;
}

export function withApis<C extends Context>(): MiddlewareFn<C & ApisFlavor> {
  const apis = getExternalApis();
  return (ctx, next) => {
    ctx.apis = apis;
    return next();
  };
}
