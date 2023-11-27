import { DENO_KV_URL } from "../config.ts";
import { BotInfoRepository } from "./bot-info.ts";

export class DbContext {
  #kv: Deno.Kv | undefined;

  readonly botInfo = new BotInfoRepository(this);

  async getKv() {
    this.#kv ??= await Deno.openKv(DENO_KV_URL);
    return this.#kv;
  }

  async get<T>(key: Deno.KvKey) {
    const kv = await this.getKv();
    return await kv.get<T>(key);
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
