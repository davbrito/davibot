import type { UserFromGetMe } from "grammy/types";

import type { DbContext } from "./dbcontext.ts";

export class BotInfoRepository {
  constructor(public readonly db: DbContext) {}

  async get() {
    return await this.db.kv.get<UserFromGetMe>("bot-info", "json");
  }

  async set(value: UserFromGetMe) {
    await this.db.kv.put("bot-info", JSON.stringify(value));
  }
}
