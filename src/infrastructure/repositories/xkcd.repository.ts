import type { ExternalApis } from "../adapters/api.adapter.ts";

const randomXkcdUrl = "https://c.xkcd.com/random/comic/";

export class XkcdRepository {
  constructor(private readonly apis: ExternalApis) {}

  async getCurrent() {
    return await this.apis.xkcd.getComic();
  }

  async get(id: number) {
    return await this.apis.xkcd.getComicById({
      path: { id },
    });
  }

  async getRandom() {
    const id = await fetch(randomXkcdUrl, {
      redirect: "manual",
    }).then((res) => {
      res.body?.cancel();
      const location = res.headers.get("Location");
      const id = location &&
        /http:\/\/xkcd.com\/(\d+)\//.exec(location)?.[1];
      if (!id) throw new Error("Could not get random xkcd comic");
      return Number(id);
    });
    return this.apis.xkcd.getComicById({
      path: { id },
    });
  }
}
