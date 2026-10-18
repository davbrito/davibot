import type { UserFromGetMe } from "@grammyjs/types";
import { strict as assert } from "node:assert";
import { createStorage } from "unstorage";
import denoKVDriver from "unstorage/drivers/deno-kv";

Deno.env.set("DENO_DEPLOYMENT_ID", "test");
Deno.env.set("AUTHOR", "test");
Deno.env.set("BOT_TOKEN", "test");
Deno.env.set("BOT_SECRET", "test");

const { DbContext } = await import("./dbcontext.ts");

async function createDb() {
  const kv = await Deno.openKv(":memory:");
  const storage = createStorage({
    driver: denoKVDriver({ openKv: () => Promise.resolve(kv) }),
  });
  return { db: new DbContext(kv, storage), kv, storage };
}

Deno.test("reads values written before the unstorage migration", async () => {
  const { db, kv, storage } = await createDb();

  try {
    await kv.set(["bot-info"], { id: 1, username: "bot" });
    await kv.set(["admin_chat_ids"], [111, 222]);
    await kv.set(["session", "abc"], {
      __d: { hiRequestId: null, xkcdSubscription: true },
    });

    assert.deepEqual(await db.botInfo.get(), { id: 1, username: "bot" });
    assert.deepEqual(await db.adminNotifier.getIds(), [111, 222]);
    assert.deepEqual(await db.session.getSession("abc"), {
      hiRequestId: null,
      xkcdSubscription: true,
    });
  } finally {
    await storage.dispose();
  }
});

Deno.test("persists small stores through unstorage", async () => {
  const { db, storage } = await createDb();
  const botInfo = { id: 1, username: "bot" } as unknown as UserFromGetMe;

  try {
    await db.botInfo.set(botInfo);
    await db.adminNotifier.register(123);
    await db.adminNotifier.register(123);
    await db.session.setSession("a", {
      __d: { hiRequestId: 7, xkcdSubscription: false },
    });
    await db.session.setSession("b", {
      __d: { hiRequestId: null, xkcdSubscription: true },
    });

    assert.deepEqual(await db.botInfo.get(), botInfo);
    assert.deepEqual(await db.adminNotifier.getIds(), [123]);

    const sessionKeys: string[] = [];
    for await (const [key] of db.session.listSessionsRaw()) {
      sessionKeys.push(key);
    }
    assert.deepEqual(sessionKeys.sort(), ["a", "b"]);

    await db.session.deleteSession("a");
    assert.equal(await db.session.getSession("a"), undefined);
  } finally {
    await storage.dispose();
  }
});

Deno.test("migrates legacy numeric xkcd subscriptions lazily", async () => {
  const { db, kv, storage } = await createDb();

  try {
    await kv.set(["xkcd_subscription", 123], true);

    const before: number[] = [];
    for await (const chatId of db.xkcdSubscription.getSubscribedChatIds()) {
      before.push(chatId);
    }
    assert.deepEqual(before, [123]);

    assert.equal(await db.xkcdSubscription.toggleSubscription(123), false);
    assert.equal(await db.kv.getItem("xkcd_subscription:123"), false);
    assert.equal((await kv.get(["xkcd_subscription", 123])).value, null);

    const after: number[] = [];
    for await (const chatId of db.xkcdSubscription.getSubscribedChatIds()) {
      after.push(chatId);
    }
    assert.deepEqual(after, []);
  } finally {
    await storage.dispose();
  }
});

Deno.test("toggles new xkcd subscriptions", async () => {
  const { db, storage } = await createDb();

  try {
    assert.equal(await db.xkcdSubscription.toggleSubscription(456), true);

    const subscribed: number[] = [];
    for await (const chatId of db.xkcdSubscription.getSubscribedChatIds()) {
      subscribed.push(chatId);
    }
    assert.deepEqual(subscribed, [456]);

    assert.equal(await db.xkcdSubscription.toggleSubscription(456), false);
  } finally {
    await storage.dispose();
  }
});
