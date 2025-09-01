import { ExternalApis } from "../adapters/api.adapter.ts";

export class XkcdRepository {
  constructor(private readonly apis: ExternalApis) {}

  async getCurrent() {
    return await this.apis.xkcd.getCurrentComic({});
  }

  async get(id: number) {
    return await this.apis.xkcd.getComic({ id });
  }

  async getRandom() {
    return await this.apis.xkcd.getRandomComic();
  }
}
