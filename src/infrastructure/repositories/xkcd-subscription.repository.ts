import type { DbContext } from "../kv/dbcontext.ts";

export class XkcdSubscriptionRepository {
  private readonly prefix = "xkcd_subscription:";

  constructor(private readonly db: DbContext) {}

  async toggleSubscription(chatId: number): Promise<boolean> {
    const key = `${this.prefix}${chatId}`;
    const prev = await this.db.kv.get<boolean>(key, "json");
    await this.db.kv.put(key, JSON.stringify(!prev));
    return !prev;
  }

  async *getSubscribedChatIds() {
    const entries = this.db.listKVPairs<boolean>(this.prefix);
    for await (const [key, value] of entries) {
      if (value) {
        const chatId = parseInt(key.slice(this.prefix.length), 10);
        yield chatId;
      }
    }
  }
}
