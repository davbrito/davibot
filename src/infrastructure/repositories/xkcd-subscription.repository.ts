import { DbContext } from "../kv/dbcontext.ts";

export class XkcdSubscriptionRepository {
  private readonly prefix: Deno.KvKey = ["xkcd_subscription"];

  constructor(private readonly db: DbContext) {}

  async toggleSubscription(chatId: number): Promise<boolean> {
    const key = this.prefix.concat(chatId);
    const prev = await this.db.kv.get<boolean>(key);
    await this.db.kv.set(key, !prev.value);
    return !prev.value;
  }

  async *getSubscribedChatIds() {
    const entries = this.db.kv.list({ prefix: this.prefix });
    for await (const {
      key: [_, chatId],
      value,
    } of entries) {
      if (value) {
        yield chatId as number;
      }
    }
  }
}
