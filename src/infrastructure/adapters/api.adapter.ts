import * as xkcd from "$apis/xkcd/index.ts";

export type ExternalApis = ReturnType<typeof getExternalApis>;

export function getExternalApis() {
  return { xkcd };
}
