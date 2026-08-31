import { HiSession } from "$application/services/hi-session.ts";
import { DbContext } from "$infrastructure/kv/dbcontext.ts";
import type { InternalSessionData } from "$infrastructure/kv/session.ts";
import {
  Composer,
  enhanceStorage,
  lazySession,
  type LazySessionFlavor,
  type StorageAdapter,
} from "grammy";
import { z } from "zod";

import type { AppContextType } from "../context.ts";

const sessionDataSchema = z.looseObject({
  hiRequestId: z.number().nullable(),
  xkcdSubscription: z.boolean(),
});

export type SessionData = z.infer<typeof sessionDataSchema>;

export type SessionManagerFlavor = LazySessionFlavor<SessionData> & {
  sessionManager: SessionManager;
};

export class SessionManager {
  #ctx: AppContextType;

  readonly hi = new HiSession(this);

  static #getInitialData(): SessionData {
    return { hiRequestId: null, xkcdSubscription: false };
  }

  constructor(ctx: AppContextType) {
    this.#ctx = ctx;
  }

  async clean(): Promise<void> {
    const session = await this.#ctx.session;
    Object.assign(session, SessionManager.#getInitialData());
  }

  async use<T>(callback: (session: SessionData) => T | Promise<T>): Promise<T> {
    this.#ctx.session ??= SessionManager.#getInitialData();
    const session = await this.#ctx.session;
    return await callback(session);
  }

  async toggleXkcdSubscription(): Promise<boolean> {
    const session = await this.#ctx.session;
    session.xkcdSubscription = !session.xkcdSubscription;
    this.#ctx.session = session;
    return session.xkcdSubscription;
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

class KvAdapter implements StorageAdapter<InternalSessionData> {
  read(key: string): Promise<InternalSessionData | undefined> {
    return DbContext.use((db) => db.session.getSessionRaw(key));
  }
  write(key: string, value: InternalSessionData): Promise<void> {
    return DbContext.use((db) => db.session.setSession(key, value));
  }

  delete(key: string): Promise<void> {
    return DbContext.use((db) => db.session.deleteSession(key));
  }

  has(key: string): Promise<boolean> {
    const result = DbContext.use((db) => db.session.getSessionRaw(key)).then(
      Boolean,
    );
    return result;
  }
  async *readAllKeys(): AsyncIterable<string> {
    using db = await DbContext.connect();
    for await (const [key] of db.session.listSessionsRaw()) {
      yield key;
    }
  }
  async *readAllValues(): AsyncIterable<InternalSessionData> {
    using db = await DbContext.connect();

    for await (const [_, value] of db.session.listSessionsRaw()) {
      yield value;
    }
  }
  async *readAllEntries(): AsyncIterable<
    [key: string, value: InternalSessionData]
  > {
    using db = await DbContext.connect();
    yield* db.session.listSessionsRaw();
  }
}
