import { env } from "cloudflare:workers";

import { AdminNotifierRepository } from "../repositories/admin-notifier.repository.ts";
import { RaeRepository } from "../repositories/rae-html.repository.ts";
import { XkcdSubscriptionRepository } from "../repositories/xkcd-subscription.repository.ts";
import { BotInfoRepository } from "./bot-info.ts";
import { SessionRepository } from "./session.ts";

export class DbContext {
  readonly adminNotifier = new AdminNotifierRepository(this);
  readonly botInfo = new BotInfoRepository(this);
  readonly rae = new RaeRepository(this);
  readonly session = new SessionRepository(this);
  readonly xkcdSubscription = new XkcdSubscriptionRepository(this);

  static connect() {
    return new DbContext();
  }

  static async use<T>(callback: (db: DbContext) => T | Promise<T>): Promise<T> {
    return await callback(DbContext.connect());
  }

  get kv() {
    return env.KV;
  }

  [Symbol.dispose]() {}

  async *listKVKeys(prefix: string) {
    let result = await this.kv.list({
      prefix,
      limit: 500,
    });

    while (!result.list_complete) {
      yield* result.keys;
      result = await this.kv.list<Uint8Array<ArrayBuffer>>({
        prefix,
        cursor: result.cursor,
      });
    }
  }

  async *listKVPairs<Value>(prefix: string) {
    for await (const { name } of this.listKVKeys(prefix)) {
      const value = await this.kv.get<Value>(name, "json");
      if (value != null) {
        yield [name, value] as const;
      }
    }
  }
}
