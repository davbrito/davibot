import * as fetchers from "$apis";

const randomXkcdUrl = "https://c.xkcd.com/random/comic/";

export type ExternalApis = ReturnType<typeof getExternalApis>;

export function getExternalApis() {
  const getComic = fetchers.xkcdFetcher
    .path("/{id}/info.0.json")
    .method("get")
    .create();
  return {
    xkcd: {
      fetcher: fetchers.xkcdFetcher,
      getCurrentComic: fetchers.xkcdFetcher
        .path("/info.0.json")
        .method("get")
        .create(),
      getComic: getComic,
      getRandomComic: async () => {
        const id = await fetch(randomXkcdUrl, {
          redirect: "manual",
        }).then((res) => {
          res.body?.cancel();
          const location = res.headers.get("Location");
          const id =
            location && /http:\/\/xkcd.com\/(\d+)\//.exec(location)?.[1];
          if (!id) throw new Error("Could not get random xkcd comic");
          return Number(id);
        });
        return getComic({ id });
      },
    },
  };
}
