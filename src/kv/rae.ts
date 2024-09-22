import { toText, toTransformStream } from "@std/streams";
import { FixedChunkStream } from "@std/streams/unstable-fixed-chunk-stream";
import { DbContext } from "./dbcontext.ts";

const MAX_BYTE_SIZE = 65_536;
const DELIMITER = 0xdabd;

export class RaeRepository {
  constructor(private readonly db: DbContext) {}

  async #getFromCache(word: string) {
    try {
      const kv = await this.db.getKv();
      const list = kv.list<Uint8Array | typeof DELIMITER>({
        prefix: ["rae-cache", word],
      });
      const stream = ReadableStream.from(list)
        .pipeThrough(
          toTransformStream(async function* (stream) {
            let last;
            for await (const { value } of stream) {
              last = value;
              if (value === DELIMITER) break;
              yield value;
            }

            if (!last) return;

            if (last === DELIMITER) {
              throw new Error("Cache is corrupted");
            }
          }),
        )
        .pipeThrough(new TextDecoderStream());

      return await toText(stream);
    } catch (error) {
      console.error(`Failed to get cached word: ${word}`, String(error));
      return undefined;
    }
  }

  async #setCache(word: string, value: ReadableStream<Uint8Array>) {
    await Promise.resolve();
    try {
      let i = 0;
      const kv = await this.db.getKv();

      const op = kv.atomic();

      for await (const { key } of kv.list({ prefix: ["rae-cache", word] })) {
        op.delete(key);
      }

      for await (const chunk of value.pipeThrough(
        new FixedChunkStream(MAX_BYTE_SIZE),
      )) {
        console.log(`caching ${word} chunk ${i}`);
        op.set(["rae-cache", word, i++], chunk, {
          expireIn: 1000 * 60 * 60 * 24,
        });
      }
      await op.commit();
    } catch (error) {
      console.error(`Failed to cache word: ${word}`, String(error));
    }
  }

  async getWordHtml(word: string) {
    const url = `https://dle.rae.es/${encodeURI(word)}`;
    const cached = await this.#getFromCache(word);
    if (cached) return { url, html: cached };

    const response = await fetch(url);
    this.#setCache(word, response.clone().body!);
    const html = await response.text();
    return { url, html };
  }

  async clearCache() {
    const kv = await this.db.getKv();
    const op = kv.atomic();

    for await (const { key } of kv.list({ prefix: ["rae-cache"] })) {
      op.delete(key);
    }

    await op.commit();
  }
}
