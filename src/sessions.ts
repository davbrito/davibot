import {
  Composer,
  enhanceStorage,
  lazySession,
  LazySessionFlavor,
  StorageAdapter,
} from "grammy";
import { z } from "zod";
import { HiSession } from "./hi-session.ts";
import { DbContext } from "./kv/dbcontext.ts";
import { AppContextType } from "./main.tsx";

const sessionDataSchema = z
  .object({
    hiRequestId: z.number().nullable(),
  })
  .passthrough();

export type SessionData = z.infer<typeof sessionDataSchema>;

export type SessionManagerFlavor = LazySessionFlavor<SessionData> & {
  sessionManager: SessionManager;
};

export class SessionManager {
  #ctx: AppContextType;

  readonly hi = new HiSession(this);

  static #getInitialData(): SessionData {
    return { hiRequestId: null };
  }
  constructor(ctx: AppContextType) {
    this.#ctx = ctx;
  }

  async clean(): Promise<void> {
    const session = await this.#ctx.session;
    Object.assign(session, SessionManager.#getInitialData());
  }

  async use<T>(callback: (session: SessionData) => T | Promise<T>): Promise<T> {
    const session = await this.#ctx.session;
    return await callback(session);
  }

  static middleware(): Composer<AppContextType> {
    return new Composer<AppContextType>()
      .use(
        lazySession({
          initial: () => this.#getInitialData(),
          storage: enhanceStorage({ storage: new KvAdapter() }),
        }),
      )
      .use((ctx, next) => {
        ctx.sessionManager = new SessionManager(ctx);
        return next();
      });
  }
}

class KvAdapter<T> implements StorageAdapter<T> {
  async read(key: string): Promise<T | undefined> {
    return await DbContext.use(async (db) => {
      const data = await db.get<T>(["session", key]);
      return data.value ? data.value : undefined;
    });
  }
  async write(key: string, value: T): Promise<void> {
    await DbContext.use(async (db) => {
      await db.set(["session", key], value);
    });
  }

  async delete(key: string): Promise<void> {
    await DbContext.use(async (db) => {
      await db.set(["session", key], undefined);
    });
  }

  async has(key: string): Promise<boolean> {
    return await DbContext.use(async (db) => {
      const data = await db.get<T>(["session", key]);
      return Boolean(data.value);
    });
  }
  async *readAllKeys(): AsyncIterable<string> {
    using db = new DbContext();
    const kv = await db.getKv();

    for await (const { key } of kv.list({ prefix: ["session"] })) {
      yield key[1] as string;
    }
  }
  async *readAllValues(): AsyncIterable<T> {
    using db = new DbContext();
    const kv = await db.getKv();

    for await (const { value } of kv.list<T>({
      prefix: ["session"],
    })) {
      yield value;
    }
  }
  async *readAllEntries(): AsyncIterable<[key: string, value: T]> {
    using db = new DbContext();
    const kv = await db.getKv();

    for await (const { key, value } of kv.list<T>({
      prefix: ["session"],
    })) {
      yield [key[1] as string, value];
    }
  }
}
