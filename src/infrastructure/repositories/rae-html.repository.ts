import { toText, toTransformStream } from "@std/streams";
import { FixedChunkStream } from "@std/streams/unstable-fixed-chunk-stream";

import type { DbContext } from "../kv/dbcontext.ts";

export class RaeRepository {
  constructor(private readonly db: DbContext) {}
  private static readonly MAX_BYTE_SIZE = 65_536;
  private static readonly CACHE_EXPIRE_TIME = 1000 * 60 * 60 * 24; // 24 hours
  public static readonly PREFIX = "rae-cache";

  #list(word?: string) {
    return this.db.kv.list<Uint8Array<ArrayBuffer>>({
      prefix: word ? [RaeRepository.PREFIX, word] : [RaeRepository.PREFIX],
    });
  }

  #getAsStream(word: string) {
    return ReadableStream.from(this.#list(word))
      .pipeThrough(
        toTransformStream(async function* (stream) {
          for await (const entry of stream) {
            yield entry.value;
          }
        }),
      )
      .pipeThrough(new TextDecoderStream());
  }

  async #getFromCache(word: string) {
    try {
      return await toText(this.#getAsStream(word));
    } catch (error) {
      console.error(`Failed to get cached word: ${word}`, String(error));
      return undefined;
    }
  }

  async #setCache(word: string, value: ReadableStream<Uint8Array>) {
    await Promise.resolve();
    try {
      const kv = this.db.kv;

      const op = kv.atomic();
      this.#delete(op, word);

      let currentIndex = 0;

      await value
        .pipeThrough(new FixedChunkStream(RaeRepository.MAX_BYTE_SIZE))
        .pipeTo(
          new WritableStream({
            write(chunk) {
              op.set([RaeRepository.PREFIX, word, currentIndex++], chunk, {
                expireIn: RaeRepository.CACHE_EXPIRE_TIME,
              });
            },
            async close() {
              await op.commit();
            },
          }),
        );
    } catch (error) {
      console.error(`Failed to cache word: ${word}`, String(error));
    }
  }

  async #delete(op: Deno.AtomicOperation, word?: string) {
    for await (const entry of this.#list(word)) {
      op.check(entry).delete(entry.key);
    }
  }

  async getWordHtml(word: string) {
    const url = `https://dle.rae.es/${encodeURI(word)}`;
    const cached = await this.#getFromCache(word);
    console.log(`[dict] Cache ${cached ? "hit" : "miss"} for word: ${word}`);
    if (cached) return { url, html: cached };

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch word HTML: ${response.status} ${response.statusText}`,
      );
    }

    this.#setCache(word, response.clone().body!);
    const html = await response.text();
    return { url, html };
  }

  async clearCache() {
    const kv = this.db.kv;
    const op = kv.atomic();
    await this.#delete(op);
    await op.commit();
  }
}
