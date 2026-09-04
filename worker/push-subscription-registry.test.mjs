import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import {
  PUSH_ACTIVE_TTL_SECONDS,
  PUSH_RENEW_AFTER_SECONDS,
  PushSubscriptionRegistry,
} from "./push-subscription-registry.mjs";

// The registry runs on Durable Object SQLite, so exercising it for real needs a
// SQLite that answers the same tiny surface: `exec(query, ...params)` returning
// something with `toArray()`. node:sqlite covers it, which lets these tests
// cover the actual class rather than a stand-in that would agree with whatever
// the code happens to do.
function sqlAdapter() {
  const db = new DatabaseSync(":memory:");

  return {
    exec(query, ...params) {
      const trimmed = query.trim();
      if (/^select/i.test(trimmed)) {
        const rows = db.prepare(trimmed).all(...params);
        return { toArray: () => rows };
      }
      if (params.length > 0) {
        db.prepare(trimmed).run(...params);
      } else {
        db.exec(trimmed);
      }
      return { toArray: () => [] };
    },
  };
}

class CountingKv {
  constructor() {
    this.data = new Map();
    this.gets = 0;
    this.puts = 0;
    this.deletes = 0;
  }

  async get(key) {
    this.gets += 1;
    return this.data.get(key) ?? null;
  }

  async put(key, value) {
    this.puts += 1;
    this.data.set(key, String(value));
  }

  async delete(key) {
    this.deletes += 1;
    this.data.delete(key);
  }
}

const id = "a".repeat(64);
const revision = "0f9d1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b";

function makeRegistry(store = new CountingKv()) {
  const sql = sqlAdapter();
  const context = {
    storage: { sql },
    blockConcurrencyWhile: (run) => run(),
  };
  const registry = new PushSubscriptionRegistry(context, {
    PUSH_SUBSCRIPTIONS: store,
  });

  return { registry, store, sql };
}

function call(registry, path, body) {
  return registry.fetch(
    new Request(`https://push-registry${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function record() {
  return {
    version: 2,
    revision,
    state: "pending",
    subscription: { endpoint: "https://fcm.googleapis.com/fcm/send/abc" },
    locale: "fr",
    updatedAt: new Date().toISOString(),
  };
}

async function activeRegistry() {
  const { registry, store, sql } = makeRegistry();
  await call(registry, "/upsert", { id, record: record() });
  await call(registry, "/promote", { id, revision });
  return { registry, store, sql };
}

test("a subscription becomes active through upsert then promote", async () => {
  const { registry, store } = await activeRegistry();

  assert.equal(store.data.has(`push:verified:${id}`), true);
  assert.equal(store.data.has(`push:pending-subscription:${id}`), false);

  const inspected = await call(registry, "/inspect", { id });
  assert.deepEqual(await inspected.json(), { state: "active" });
});

test("renewing a fresh lease costs no KV operation at all", async () => {
  const { registry, store } = await activeRegistry();
  const before = { gets: store.gets, puts: store.puts };

  // What a broadcast does for every subscriber it reaches.
  for (let index = 0; index < 20; index += 1) {
    const response = await call(registry, "/renew", { id, revision });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).renewed, false);
  }

  assert.equal(store.puts - before.puts, 0);
  assert.equal(store.gets - before.gets, 0);
});

test("a lease that has actually aged is still renewed", async () => {
  const { registry, store, sql } = await activeRegistry();
  const before = store.puts;

  // Wind the stored expiry back so more than the renewal window has elapsed.
  sql.exec(
    "UPDATE push_registrations SET expires_at = ? WHERE id = ?",
    Date.now() +
      (PUSH_ACTIVE_TTL_SECONDS - PUSH_RENEW_AFTER_SECONDS - 60) * 1_000,
    id,
  );

  const response = await call(registry, "/renew", { id, revision });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).renewed, true);
  assert.equal(store.puts - before, 1);

  // And the extension resets the window, so the next push is free again.
  const again = await call(registry, "/renew", { id, revision });
  assert.equal((await again.json()).renewed, false);
  assert.equal(store.puts - before, 1);
});

test("renewal still refuses an unknown or superseded registration", async () => {
  const { registry, sql } = await activeRegistry();

  const stale = await call(registry, "/renew", {
    id,
    revision: "11111111-2222-4333-8444-555555555555",
  });
  assert.equal(stale.status, 200);
  assert.equal((await stale.json()).renewed, false);

  // Once the lease has aged the revision is checked against the stored record.
  sql.exec(
    "UPDATE push_registrations SET expires_at = ? WHERE id = ?",
    Date.now() +
      (PUSH_ACTIVE_TTL_SECONDS - PUSH_RENEW_AFTER_SECONDS - 60) * 1_000,
    id,
  );
  const conflict = await call(registry, "/renew", {
    id,
    revision: "11111111-2222-4333-8444-555555555555",
  });
  assert.equal(conflict.status, 409);

  const unknown = await call(registry, "/renew", {
    id: "b".repeat(64),
    revision,
  });
  assert.equal(unknown.status, 404);
});

test("release removes the registration from both stores", async () => {
  const { registry, store } = await activeRegistry();

  const released = await call(registry, "/release", { id });
  assert.equal(released.status, 200);
  assert.equal(store.data.has(`push:verified:${id}`), false);

  const inspected = await call(registry, "/inspect", { id });
  assert.equal(inspected.status, 404);
});

test("an expired lease is swept before it can be renewed", async () => {
  const { registry, sql } = await activeRegistry();
  sql.exec(
    "UPDATE push_registrations SET expires_at = ? WHERE id = ?",
    Date.now() - 1_000,
    id,
  );

  const response = await call(registry, "/renew", { id, revision });
  assert.equal(response.status, 404);
});
