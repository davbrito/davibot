import type { DbContext } from "../kv/dbcontext.ts";

export class RaeRepository {
  constructor(private readonly db: DbContext) {}
  public static readonly PREFIX = "rae-cache";

  async *#list(word?: string) {
    const prefix = word
      ? RaeRepository.PREFIX + ":" + word
      : RaeRepository.PREFIX;

    yield* this.db.listKVKeys(prefix);
  }

  async #getFromCache(word: string) {
    try {
      return await this.db.kv.get(`${RaeRepository.PREFIX}:${word}`, "text");
    } catch (error) {
      console.error(`Failed to get cached word: ${word}`, String(error));
      return undefined;
    }
  }

  async #setCache(word: string, value: ReadableStream<Uint8Array>) {
    await Promise.resolve();
    try {
      const kv = this.db.kv;

      await kv.put(`${RaeRepository.PREFIX}:${word}`, value);
    } catch (error) {
      console.error(`Failed to cache word: ${word}`, error);
    }
  }

  async #delete(word?: string) {
    for await (const entry of this.#list(word)) {
      await this.db.kv.delete(entry.name);
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
    await this.#delete();
  }
}
