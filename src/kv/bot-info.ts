import { UserFromGetMe } from "@grammyjs/types";
import { DbContext } from "./dbcontext.ts";

export class BotInfoRepository {
  constructor(public readonly db: DbContext) {}

  async get() {
    const botInfo = await this.db.get<UserFromGetMe>(["bot-info"]);
    return botInfo.value;
  }

  async set(value: UserFromGetMe) {
    await this.db.getKv().then((kv) => kv.set(["bot-info"], value));
  }
}
