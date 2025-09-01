import { SessionData } from "../../session/sessions.ts";
import { DbContext } from "./dbcontext.ts";

export class SessionRepository {
  constructor(private readonly db: DbContext) {}

  async getSession(key: string): Promise<SessionData | undefined> {
    const data = await this.db.kv.get<SessionData>(["session", key]);
    return data.value || undefined;
  }

  async setSession(key: string, value: SessionData): Promise<void> {
    await this.db.kv.set(["session", key], value);
  }

  async deleteSession(key: string): Promise<void> {
    await this.db.kv.delete(["session", key]);
  }

  async *listSessions(): AsyncIterable<[string, SessionData]> {
    for await (const { key, value } of this.db.kv.list<SessionData>({
      prefix: ["session"],
    })) {
      yield [key[1] as string, value];
    }
  }
}
