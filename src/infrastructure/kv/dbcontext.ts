import type { Storage } from "unstorage";

import { AdminNotifierRepository } from "../repositories/admin-notifier.repository.ts";
import { RaeRepository } from "../repositories/rae-html.repository.ts";
import { XkcdSubscriptionRepository } from "../repositories/xkcd-subscription.repository.ts";
import { BotInfoRepository } from "./bot-info.ts";
import { SessionRepository } from "./session.ts";
import { getDenoKv, getStorage } from "./storage.ts";

export class DbContext {
  readonly adminNotifier = new AdminNotifierRepository(this);
  readonly botInfo = new BotInfoRepository(this);
  readonly rae = new RaeRepository(this);
  readonly session = new SessionRepository(this);
  readonly xkcdSubscription = new XkcdSubscriptionRepository(this);

  constructor(
    private readonly denoKv: Deno.Kv,
    private readonly storage: Storage,
  ) {}

  static async connect() {
    return new DbContext(await getDenoKv(), getStorage());
  }

  static async use<T>(callback: (db: DbContext) => T | Promise<T>): Promise<T> {
    using db = await DbContext.connect();
    return await callback(db);
  }

  /** unstorage-backed store for bot info, sessions, admin IDs and xkcd. */
  get kv(): Storage {
    return this.storage;
  }

  /**
   * Raw Deno KV connection. Used by the RAE HTML cache, which needs typed
   * keys, atomic writes and 64 KiB chunks.
   */
  get rawKv(): Deno.Kv {
    return this.denoKv;
  }

  [Symbol.dispose]() {
    // Connections are cached at module scope and shared between requests.
  }

  async *listKVKeys(prefix: string) {
    for (const name of await this.kv.getKeys(prefix)) {
      yield name;
    }
  }

  async *listKVPairs<Value>(prefix: string) {
    for await (const name of this.listKVKeys(prefix)) {
      const value = await this.kv.getItem<Value>(name);
      if (value != null) {
        yield [name, value] as const;
      }
    }
  }
}
