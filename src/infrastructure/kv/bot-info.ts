import type { UserFromGetMe } from "@grammyjs/types";

import type { DbContext } from "./dbcontext.ts";

export class BotInfoRepository {
  constructor(public readonly db: DbContext) {}

  async get() {
    const botInfo = await this.db.kv.get<UserFromGetMe>(["bot-info"]);
    return botInfo.value;
  }

  async set(value: UserFromGetMe) {
    await this.db.kv.set(["bot-info"], value);
  }
}
