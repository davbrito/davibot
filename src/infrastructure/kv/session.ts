import type { Enhance } from "grammy";

import type { SessionData } from "../../session/sessions.ts";
import type { DbContext } from "./dbcontext.ts";

export type InternalSessionData = Enhance<SessionData>;

export class SessionRepository {
  constructor(private readonly db: DbContext) {}

  async getSessionRaw(key: string): Promise<InternalSessionData | undefined> {
    const data = await this.db.kv.get<InternalSessionData>(
      `session:${key}`,
      "json",
    );
    return data ?? undefined;
  }

  async getSession(key: string): Promise<SessionData | undefined> {
    const data = await this.getSessionRaw(key);
    return data?.__d;
  }

  async setSession(key: string, value: InternalSessionData): Promise<void> {
    await this.db.kv.put(`session:${key}`, JSON.stringify(value));
  }

  async deleteSession(key: string): Promise<void> {
    await this.db.kv.delete(`session:${key}`);
  }

  async *listSessionsRaw(): AsyncIterable<[string, InternalSessionData]> {
    for await (const [key, value] of this.db.listKVPairs<InternalSessionData>(
      "session:",
    )) {
      yield [key.slice("session:".length), value];
    }
  }

  async *listSessions(): AsyncIterable<[string, SessionData]> {
    for await (const [key, value] of this.listSessionsRaw()) {
      yield [key, value.__d];
    }
  }
}
