import * as fetchers from "$apis";
import type { Context, MiddlewareFn } from "grammy";

export interface ApisFlavor {
  apis: typeof apis;
}

const randomXkcdUrl = "https://c.xkcd.com/random/comic/";

const apis = {
  xkcd: {
    fetcher: fetchers.xkcdFetcher,
    getCurrentComic: fetchers.xkcdFetcher
      .path("/info.0.json")
      .method("get")
      .create(),
    getComic: fetchers.xkcdFetcher
      .path("/{id}/info.0.json")
      .method("get")
      .create(),
    getRandomComic: async () => {
      const id = await fetch(randomXkcdUrl, {
        redirect: "manual",
      }).then((res) => {
        res.body?.cancel();
        const location = res.headers.get("Location");
        const id = location && /http:\/\/xkcd.com\/(\d+)\//.exec(location)?.[1];
        if (!id) throw new Error("Could not get random xkcd comic");
        return Number(id);
      });
      return apis.xkcd.getComic({ id });
    },
  },
};

export function withApis<C extends Context>(): MiddlewareFn<C & ApisFlavor> {
  return (ctx, next) => {
    ctx.apis = apis;
    return next();
  };
}
