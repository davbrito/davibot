import type { ExternalApis } from "$infrastructure/adapters/api.adapter.ts";
import { getExternalApis } from "$infrastructure/adapters/api.adapter.ts";
import type { Context, MiddlewareFn } from "grammy";

export type ApisFlavor<C extends Context> = C & {
  apis: ExternalApis;
};

export function withApis<C extends Context>(): MiddlewareFn<ApisFlavor<C>> {
  const apis = getExternalApis();
  return (ctx, next) => {
    ctx.apis = apis;
    return next();
  };
}
