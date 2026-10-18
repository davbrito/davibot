import { AsyncLocalStorage } from "node:async_hooks";

import type { Storage } from "unstorage";

import { AdminNotifierRepository } from "../repositories/admin-notifier.repository.ts";
import { RaeRepository } from "../repositories/rae-html.repository.ts";
import { XkcdSubscriptionRepository } from "../repositories/xkcd-subscription.repository.ts";
import { BotInfoRepository } from "./bot-info.ts";
import { SessionRepository } from "./session.ts";

export const dbStorage = new AsyncLocalStorage<DbContext>();

export class DbContext {
  readonly adminNotifier = new AdminNotifierRepository(this);
  readonly botInfo = new BotInfoRepository(this);
  readonly rae = new RaeRepository(this);
  readonly session = new SessionRepository(this);
  readonly xkcdSubscription = new XkcdSubscriptionRepository(this);

  constructor(readonly kv: Storage) {}

  static connect(storage?: Storage): DbContext {
    if (storage) {
      return new DbContext(storage);
    }
    const current = dbStorage.getStore();
    if (current) {
      return current;
    }
    throw new Error(
      "No Storage provided and DbContext is not in an active AsyncLocalStorage context",
    );
  }

  static async use<T>(
    storageOrCallback: Storage | ((db: DbContext) => T | Promise<T>),
    maybeCallback?: (db: DbContext) => T | Promise<T>,
  ): Promise<T> {
    if (typeof storageOrCallback === "function") {
      const db = DbContext.connect();
      return await storageOrCallback(db);
    }
    if (!maybeCallback) {
      throw new Error("Callback must be provided to DbContext.use");
    }
    return await maybeCallback(DbContext.connect(storageOrCallback));
  }

  [Symbol.dispose]() {}

  async *listKVKeys(prefix: string) {
    // unstorage paginates internally and strips the trailing colon itself.
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
