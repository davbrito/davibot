import type { DbContext } from "../kv/dbcontext.ts";

const PREFIX = "xkcd_subscription:";
const LEGACY_PREFIX: Deno.KvKey = ["xkcd_subscription"];

export class XkcdSubscriptionRepository {
  constructor(private readonly db: DbContext) {}

  async toggleSubscription(chatId: number): Promise<boolean> {
    const key = `${PREFIX}${chatId}`;
    const [current, legacy] = await Promise.all([
      this.db.kv.getItem<boolean>(key),
      this.db.rawKv.get<boolean>([...LEGACY_PREFIX, chatId]),
    ]);

    // The string key wins; the numeric one is only a fallback for records
    // created before the unstorage migration.
    const previous = current ?? legacy.value ?? false;
    await this.db.kv.setItem(key, !previous);

    if (legacy.value !== null) {
      await this.db.rawKv.delete([...LEGACY_PREFIX, chatId]);
    }

    return !previous;
  }

  async *getSubscribedChatIds() {
    const seen = new Set<number>();

    for await (
      const [key, value] of this.db.listKVPairs<boolean>(PREFIX)
    ) {
      const chatId = parseInt(key.slice(PREFIX.length), 10);
      if (Number.isNaN(chatId)) continue;

      seen.add(chatId);
      if (value) yield chatId;
    }

    // Keep sending to subscribers stored with the old numeric key until the
    // lazy migration or `deno task migrate-kv` moves them.
    for await (
      const { key, value } of this.db.rawKv.list<boolean>({
        prefix: LEGACY_PREFIX,
      })
    ) {
      const chatId = key[1];
      if (typeof chatId === "number" && !seen.has(chatId) && value) {
        seen.add(chatId);
        yield chatId;
      }
    }
  }
}
