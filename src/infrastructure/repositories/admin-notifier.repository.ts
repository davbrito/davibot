import { DbContext } from "../kv/dbcontext.ts";

const ADMIN_CHAT_IDS_KEY = ["admin_chat_ids"];

export class AdminNotifierRepository {
  constructor(private readonly db: DbContext) {}

  async register(chatId: number): Promise<void> {
    const ids = await this.getIds();
    if (ids.includes(chatId)) return;
    ids.push(chatId);
    await this.db.kv.set(ADMIN_CHAT_IDS_KEY, ids);
  }

  async getIds(): Promise<number[]> {
    const entry = await this.db.kv.get<number[]>(ADMIN_CHAT_IDS_KEY);
    return entry.value ?? [];
  }
}
