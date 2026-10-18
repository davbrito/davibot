import { createStorage, type Storage } from "unstorage";
import cloudflareKVBindingDriver from "unstorage/drivers/cloudflare-kv-binding";

/**
 * Creates unstorage instance backed by Cloudflare KV binding.
 *
 * Repositories only know unstorage's `Storage` interface, so the driver can be
 * swapped here without touching any of them.
 */
export function createKvStorage(kv: KVNamespace): Storage {
  return createStorage({
    driver: cloudflareKVBindingDriver({ binding: kv }),
  });
}
