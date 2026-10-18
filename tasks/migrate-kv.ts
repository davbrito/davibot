import { DbContext } from "../src/infrastructure/kv/dbcontext.ts";

/**
 * One-off migration for xkcd subscriptions written before the unstorage
 * migration. Those live under the numeric key ["xkcd_subscription", chatId]
 * while the new repository uses "xkcd_subscription:<chatId>".
 *
 * The repository already reads both shapes, so this task only cleans up the
 * legacy numeric keys after merging them into the new ones.
 */
const db = await DbContext.connect();
const legacy: Array<[number, boolean]> = [];

for await (
  const { key, value } of db.rawKv.list<boolean>({
    prefix: ["xkcd_subscription"],
  })
) {
  const chatId = key[1];
  if (typeof chatId === "number") {
    legacy.push([chatId, value]);
  }
}

for (const [chatId, value] of legacy) {
  const key = `xkcd_subscription:${chatId}`;
  const existing = await db.kv.getItem<boolean>(key);

  // Preserve a subscription if either representation had it.
  await db.kv.setItem(key, Boolean(existing) || Boolean(value));
  await db.rawKv.delete(["xkcd_subscription", chatId]);
}

console.log(`Migrated ${legacy.length} legacy xkcd subscription(s).`);

// The storage and raw KV share one connection; dispose closes it.
await db.kv.dispose();
Deno.exit(0);
