import type { UserFromGetMe } from "@grammyjs/types";

import type { DbContext } from "./dbcontext.ts";

export class BotInfoRepository {
  constructor(public readonly db: DbContext) {}

  async get() {
    return (await this.db.kv.getItem<UserFromGetMe>("bot-info")) ?? undefined;
  }

  async set(value: UserFromGetMe) {
    await this.db.kv.setItem("bot-info", value);
  }
}
