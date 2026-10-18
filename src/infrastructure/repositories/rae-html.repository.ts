import { toText, toTransformStream } from "@std/streams";
import { FixedChunkStream } from "@std/streams/unstable-fixed-chunk-stream";

import { UpstreamUnavailableError } from "../../errors.ts";
import type { DbContext } from "../kv/dbcontext.ts";

/**
 * `dle.rae.es` sits behind a Cloudflare Managed Challenge that advertises the
 * client hints it expects (`Accept-CH: Sec-CH-UA*`) and answers bare requests
 * with `403 Forbidden` (`cf-mitigated: challenge`). Sending browser-like
 * headers makes the request look like a real visitor instead of a bot.
 */
const BROWSER_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "es-ES,es;q=0.9",
  "Sec-CH-UA": '"Not A;Brand";v="99", "Chromium";v="91", "Google Chrome";v="91"',
  "Sec-CH-UA-Mobile": "?0",
  "Sec-CH-UA-Platform": '"Windows"',
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class RaeRepository {
  constructor(private readonly db: DbContext) {}
  private static readonly MAX_BYTE_SIZE = 65_536;
  private static readonly CACHE_EXPIRE_TIME = 1000 * 60 * 60 * 24; // 24 hours
  public static readonly PREFIX = "rae-cache";

  #list(word?: string) {
    return this.db.rawKv.list<Uint8Array<ArrayBuffer>>({
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
      console.error("Failed to get cached word", {
        word,
        error: errorMessage(error),
      });
      return undefined;
    }
  }

  async #setCache(word: string, value: ReadableStream<Uint8Array>) {
    try {
      const kv = this.db.rawKv;

      const op = kv.atomic();
      await this.#delete(op, word);

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
      console.error("Failed to cache word", {
        word,
        error: errorMessage(error),
      });
    }
  }

  async #delete(op: Deno.AtomicOperation, word?: string) {
    for await (const entry of this.#list(word)) {
      op.check(entry).delete(entry.key);
    }
  }

  /**
   * Fetch a word page, translating any failure into an
   * {@link UpstreamUnavailableError} so callers can tell an RAE outage apart
   * from a real bug.
   */
  async #fetchWord(word: string, url: string) {
    let response: Response;
    try {
      response = await fetch(url, { headers: BROWSER_HEADERS });
    } catch (cause) {
      console.error("Could not reach the RAE", {
        word,
        error: errorMessage(cause),
      });
      throw new UpstreamUnavailableError("dle.rae.es", { cause });
    }

    if (!response.ok) {
      const challenge = response.headers.get("cf-mitigated") === "challenge";
      console.error("The RAE refused to serve the word", {
        word,
        status: response.status,
        statusText: response.statusText,
        challenge,
      });
      throw new UpstreamUnavailableError("dle.rae.es", {
        status: response.status,
        statusText: response.statusText,
        challenge,
      });
    }

    return response;
  }

  async getWordHtml(word: string) {
    const url = `https://dle.rae.es/${encodeURI(word)}`;
    const cached = await this.#getFromCache(word);
    console.log(`[dict] Cache ${cached ? "hit" : "miss"} for word: ${word}`);
    if (cached) return { url, html: cached };

    const response = await this.#fetchWord(word, url);

    // Start the chunked cache write while the body is being read, but do not
    // return until it settles. That keeps the cache from being cut off when
    // the request finishes.
    const cacheResponse = response.clone();
    const cachePromise = cacheResponse.body
      ? this.#setCache(word, cacheResponse.body)
      : Promise.resolve();

    const html = await response.text();
    await cachePromise;

    return { url, html };
  }

  async clearCache() {
    const kv = this.db.rawKv;
    const op = kv.atomic();
    await this.#delete(op);
    await op.commit();
  }
}
