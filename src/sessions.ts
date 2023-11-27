import { z } from "zod";
import type { Message } from "@grammyjs/types";

const sessionDataSchema = z.object({
  hiRequestId: z.number().nullable(),
});

const sessionSchema = sessionDataSchema.transform((data) => new Session(data));

type SessionData = z.infer<typeof sessionDataSchema>;

export class Session {
  #data: SessionData;

  static #getInitialData(): SessionData {
    return { hiRequestId: null };
  }
  constructor(data?: SessionData) {
    this.#data = data ?? Session.#getInitialData();
  }
  isHiRequestReply(message: Message) {
    return isHiRequestReply(this.#data, message);
  }
  removeHiRequest(message: Message) {
    removeHiRequest(this.#data, message);
  }
  addHiRequest(message: Message) {
    setHiRequest(this.#data, message);
  }

  clean() {
    this.#data = Session.#getInitialData();
  }

  toJSON(): SessionData {
    return this.#data;
  }

  static fromJSON(data: unknown): Session {
    return sessionSchema.parse(data);
  }
}

function isHiRequestReply(data: SessionData, message: Message) {
  const reply_to_message_id = message.reply_to_message?.message_id;
  if (!reply_to_message_id) return false;
  return data.hiRequestId === reply_to_message_id;
}

function removeHiRequest(data: SessionData, message: Message) {
  const message_id = message.reply_to_message?.message_id;
  if (!message_id) return;
  if (data.hiRequestId === message_id) {
    data.hiRequestId = null;
  }
}

function setHiRequest(data: SessionData, message: Message) {
  const message_id = message.message_id;
  if (data.hiRequestId === message_id) return;
  data.hiRequestId = message_id;
}

export function getInitialSessionData(): Session {
  return new Session();
}
