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
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "es-ES,es;q=0.9",
  "Sec-CH-UA":
    '"Not A;Brand";v="99", "Chromium";v="91", "Google Chrome";v="91"',
  "Sec-CH-UA-Mobile": "?0",
  "Sec-CH-UA-Platform": '"Windows"',
};

export class RaeRepository {
  constructor(private readonly db: DbContext) {}
  public static readonly PREFIX = "rae-cache";

  static key(word: string) {
    return `${RaeRepository.PREFIX}:${word}`;
  }

  async *#list(word?: string) {
    yield* this.db.listKVKeys(
      word ? RaeRepository.key(word) : RaeRepository.PREFIX,
    );
  }

  async #getFromCache(word: string) {
    try {
      return await this.db.kv.getItemRaw<string>(RaeRepository.key(word));
    } catch (error) {
      console.error(`Failed to get cached word: ${word}`, String(error));
      return undefined;
    }
  }

  #setCache(word: string, html: string) {
    return this.db.kv
      .setItemRaw(RaeRepository.key(word), html)
      .catch((error) => {
        console.error(`Failed to cache word: ${word}`, error);
      });
  }

  async #delete(word?: string) {
    for await (const name of this.#list(word)) {
      await this.db.kv.removeItem(name);
    }
  }

  async getWordHtml(word: string) {
    const url = `https://dle.rae.es/${encodeURI(word)}`;
    const cached = await this.#getFromCache(word);
    console.log(`[dict] Cache ${cached ? "hit" : "miss"} for word: ${word}`);
    if (cached) return { url, html: cached };

    const response = await this.#fetchWord(word, url);

    const html = await response.text();
    await this.#setCache(word, html);

    return { url, html };
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
        error: cause instanceof Error ? cause.message : String(cause),
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

  async clearCache() {
    await this.#delete();
  }
}
