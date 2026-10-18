import { createStorage, type Storage } from "unstorage";
import denoKVDriver from "unstorage/drivers/deno-kv";

import { DENO_KV_URL } from "../../config.ts";

let kvPromise: Promise<Deno.Kv> | undefined;

/**
 * Single Deno KV connection shared by the raw KV users (RAE cache) and the
 * unstorage driver. It lives for the whole isolate.
 */
export function getDenoKv(): Promise<Deno.Kv> {
  return (kvPromise ??= Deno.openKv(DENO_KV_URL));
}

let storage: Storage | undefined;

/**
 * unstorage facade for the small key-value stores (bot info, sessions, admin
 * IDs and xkcd subscriptions). The RAE HTML cache stays on raw Deno KV because
 * its 64 KiB chunking and atomic writes do not map to a single unstorage value.
 */
export function getStorage(): Storage {
  return (storage ??= createStorage({
    driver: denoKVDriver({ openKv: getDenoKv }),
  }));
}
