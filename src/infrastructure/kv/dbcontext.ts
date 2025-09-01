import { DENO_KV_URL } from "../../config.ts";
import { RaeRepository } from "../repositories/rae-html.repository.ts";
import { BotInfoRepository } from "./bot-info.ts";
import { SessionRepository } from "./session.ts";

export class DbContext {
  #kv: Deno.Kv | undefined;

  readonly botInfo = new BotInfoRepository(this);
  readonly rae = new RaeRepository(this);
  readonly session = new SessionRepository(this);

  constructor(kv: Deno.Kv) {
    this.#kv = kv;
  }

  static async connect() {
    return new DbContext(await Deno.openKv(DENO_KV_URL));
  }

  static async use<T>(callback: (db: DbContext) => T | Promise<T>): Promise<T> {
    using db = await DbContext.connect();
    return await callback(db);
  }

  get kv() {
    if (!this.#kv) throw new Error("you are using a disposed connection");
    return this.#kv;
  }

  dispose() {
    this.#kv?.close();
    this.#kv = undefined;
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
