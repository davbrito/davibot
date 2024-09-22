import { DENO_KV_URL } from "../config.ts";
import { BotInfoRepository } from "./bot-info.ts";
import { RaeRepository } from "./rae.ts";

export class DbContext {
  #kv: Deno.Kv | undefined;

  readonly botInfo = new BotInfoRepository(this);
  readonly rae = new RaeRepository(this);

  async getKv() {
    this.#kv ??= await Deno.openKv(DENO_KV_URL);
    return this.#kv;
  }

  async get<T>(key: Deno.KvKey) {
    const kv = await this.getKv();
    return await kv.get<T>(key);
  }

  async set(
    key: Deno.KvKey,
    value: unknown,
    options?: {
      expireIn?: number;
    },
  ) {
    const kv = await this.getKv();
    return await kv.set(key, value, options);
  }
  async delete(key: Deno.KvKey): Promise<void> {
    const kv = await this.getKv();
    await kv.delete(key);
  }

  async clearCache(): Promise<void> {
    await this.rae.clearCache();
  }

  [Symbol.dispose]() {
    this.#kv?.close();
  }

  static async use<T>(callback: (db: DbContext) => Promise<T>) {
    const db = new DbContext();
    try {
      return await callback(db);
    } finally {
      db[Symbol.dispose]();
    }
  }
}
