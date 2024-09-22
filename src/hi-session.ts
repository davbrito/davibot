import { Message } from "@grammyjs/types";
import { SessionManager } from "./sessions.ts";

export class HiSession {
  constructor(private readonly manager: SessionManager) {}

  async isHiRequestReply(message: Message): Promise<boolean> {
    return await this.manager.use((session) => {
      const reply_to_message_id = message.reply_to_message?.message_id;
      if (!reply_to_message_id) return false;
      return session.hiRequestId === reply_to_message_id;
    });
  }

  async removeHiRequest(message: Message) {
    await this.manager.use((session) => {
      const message_id = message.reply_to_message?.message_id;
      if (!message_id) return;
      if (session.hiRequestId === message_id) {
        session.hiRequestId = null;
      }
    });
  }

  async setHiRequest(message: Message) {
    await this.manager.use((session) => {
      const message_id = message.message_id;
      if (session.hiRequestId === message_id) return;
      session.hiRequestId = message_id;
    });
  }
}
