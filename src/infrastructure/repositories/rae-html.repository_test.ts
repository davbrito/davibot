import { strict as assert } from "node:assert";
import { createStorage } from "unstorage";

import { UpstreamUnavailableError } from "../../errors.ts";
import { RaeRepository } from "./rae-html.repository.ts";

Deno.env.set("DENO_DEPLOYMENT_ID", "test");
Deno.env.set("AUTHOR", "test");
Deno.env.set("BOT_TOKEN", "test");
Deno.env.set("BOT_SECRET", "test");

const { DbContext } = await import("../kv/dbcontext.ts");

async function createRepo() {
  const kv = await Deno.openKv(":memory:");
  const storage = createStorage();
  const db = new DbContext(kv, storage);
  return { db, kv, storage, repo: new RaeRepository(db) };
}

function stubFetch(handler: () => Promise<Response>) {
  const original = globalThis.fetch;
  globalThis.fetch = handler as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

Deno.test("classifies a RAE bot challenge", async () => {
  const { kv, repo, storage } = await createRepo();
  const restoreFetch = stubFetch(() =>
    Promise.resolve(
      new Response("blocked", {
        status: 403,
        statusText: "Forbidden",
        headers: { "cf-mitigated": "challenge" },
      }),
    )
  );

  try {
    await assert.rejects(
      () => repo.getWordHtml("casa"),
      (error: unknown) => {
        assert.ok(error instanceof UpstreamUnavailableError);
        assert.equal(error.status, 403);
        assert.equal(error.challenge, true);
        return true;
      },
    );
  } finally {
    restoreFetch();
    await storage.dispose();
    kv.close();
  }
});

Deno.test("classifies a network failure", async () => {
  const { kv, repo, storage } = await createRepo();
  const restoreFetch = stubFetch(() => Promise.reject(new TypeError("network down")));

  try {
    await assert.rejects(
      () => repo.getWordHtml("casa"),
      (error: unknown) => {
        assert.ok(error instanceof UpstreamUnavailableError);
        assert.equal(error.challenge, false);
        return true;
      },
    );
  } finally {
    restoreFetch();
    await storage.dispose();
    kv.close();
  }
});

Deno.test("caches RAE pages in 64 KiB chunks", async () => {
  const { kv, repo, storage } = await createRepo();
  const html = "<html>" + "a".repeat(70_000) + "</html>";
  let calls = 0;
  const restoreFetch = stubFetch(() => {
    calls++;
    return Promise.resolve(new Response(html, { status: 200 }));
  });

  try {
    const first = await repo.getWordHtml("casa");
    assert.equal(first.html, html);
    assert.equal(calls, 1);

    const second = await repo.getWordHtml("casa");
    assert.equal(second.html, html);
    assert.equal(calls, 1);

    let chunks = 0;
    for await (const _entry of kv.list({ prefix: ["rae-cache", "casa"] })) {
      chunks++;
    }
    assert.ok(chunks >= 2);

    await repo.clearCache();

    let remaining = 0;
    for await (const _entry of kv.list({ prefix: ["rae-cache"] })) {
      remaining++;
    }
    assert.equal(remaining, 0);
  } finally {
    restoreFetch();
    await storage.dispose();
    kv.close();
  }
});
