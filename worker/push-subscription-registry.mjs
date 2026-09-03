export const PUSH_ACTIVE_TTL_SECONDS = 180 * 24 * 60 * 60;
export const PUSH_PENDING_TTL_SECONDS = 10 * 60;

const DEFAULT_ACTIVE_LIMIT = 5_000;
const DEFAULT_PENDING_LIMIT = 256;
const REGISTRATION_ID_PATTERN = /^[a-f0-9]{64}$/;
const REVISION_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIVE_PREFIX = "push:verified:";
const PENDING_PREFIX = "push:pending-subscription:";
const LEGACY_PREFIX = "push:subscription:";

function configuredLimit(env, name, fallback) {
  const value = env?.[name];
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) throw new Error(`${name} must be an integer.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 100_000) {
    throw new Error(`${name} is outside the supported range.`);
  }
  return parsed;
}

function json(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function firstRow(cursor) {
  return cursor.toArray()[0] ?? null;
}

function activeKey(id) {
  return ACTIVE_PREFIX + id;
}

function pendingKey(id) {
  return PENDING_PREFIX + id;
}

function legacyKey(id) {
  return LEGACY_PREFIX + id;
}

function validateRecord(record) {
  if (
    !record ||
    typeof record !== "object" ||
    Array.isArray(record) ||
    record.version !== 2 ||
    record.state !== "pending" ||
    !REVISION_PATTERN.test(record.revision ?? "") ||
    !record.subscription ||
    typeof record.subscription !== "object" ||
    typeof record.locale !== "string" ||
    typeof record.updatedAt !== "string"
  ) {
    throw new TypeError("Invalid push subscription record.");
  }

  const encoded = JSON.stringify(record);
  if (new TextEncoder().encode(encoded).byteLength > 8_192) {
    throw new TypeError("Push subscription record is too large.");
  }
  return record;
}

function validateRequestBody(body, { record = false, revision = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new TypeError("Invalid registry request.");
  }
  const expected = new Set([
    "id",
    ...(record ? ["record"] : []),
    ...(revision ? ["revision"] : []),
  ]);
  if (
    Object.keys(body).length !== expected.size ||
    Object.keys(body).some((key) => !expected.has(key)) ||
    !REGISTRATION_ID_PATTERN.test(body.id ?? "")
  ) {
    throw new TypeError("Invalid registry request.");
  }
  if (record) validateRecord(body.record);
  if (revision && !REVISION_PATTERN.test(body.revision ?? "")) {
    throw new TypeError("Invalid registry revision.");
  }
  return body;
}

function parseStoredRecord(raw) {
  if (!raw) return null;
  try {
    const record = JSON.parse(raw);
    return REVISION_PATTERN.test(record?.revision ?? "") ? record : null;
  } catch {
    return null;
  }
}

export class PushSubscriptionRegistry {
  constructor(context, env) {
    this.context = context;
    this.env = env;
    this.operationQueue = Promise.resolve();

    context.blockConcurrencyWhile(async () => {
      context.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS push_registrations (
          id TEXT PRIMARY KEY,
          state TEXT NOT NULL CHECK (state IN ('pending', 'active')),
          expires_at INTEGER NOT NULL
        )
      `);
      context.storage.sql.exec(`
        CREATE INDEX IF NOT EXISTS push_registrations_expiry
        ON push_registrations (expires_at)
      `);
    });
  }

  fetch(request) {
    // KV is not transactional with Durable Object SQLite. Serializing every
    // lifecycle mutation here prevents an in-flight delivery from restoring a
    // record after DELETE or overwriting a newer locale/subscription revision.
    const operation = this.operationQueue.then(() => this.handle(request));
    this.operationQueue = operation.catch(() => undefined);
    return operation;
  }

  async handle(request) {
    if (request.method !== "POST") {
      return json({ error: "Method not allowed." }, { status: 405 });
    }
    if (!this.env.PUSH_SUBSCRIPTIONS) {
      return json({ error: "Push storage is unavailable." }, { status: 503 });
    }

    const path = new URL(request.url).pathname;
    let body;
    try {
      const input = await request.json();
      if (path === "/upsert" || path === "/migrate") {
        body = validateRequestBody(input, { record: true });
      } else if (
        path === "/promote" ||
        path === "/renew" ||
        path === "/release-if-current"
      ) {
        body = validateRequestBody(input, { revision: true });
      } else {
        body = validateRequestBody(input);
      }
    } catch {
      return json({ error: "Invalid registry request." }, { status: 400 });
    }

    const now = Date.now();
    const sql = this.context.storage.sql;
    const store = this.env.PUSH_SUBSCRIPTIONS;
    sql.exec("DELETE FROM push_registrations WHERE expires_at <= ?", now);

    if (path === "/upsert" || path === "/migrate") {
      if (path === "/migrate" && !(await store.get(legacyKey(body.id)))) {
        return json({ error: "Legacy registration not found." }, { status: 404 });
      }

      const existing = firstRow(
        sql.exec(
          "SELECT state, expires_at FROM push_registrations WHERE id = ?",
          body.id,
        ),
      );
      const state = existing?.state ?? "pending";
      let created = false;

      if (!existing) {
        const activeLimit = configuredLimit(
          this.env,
          "PUSH_ACTIVE_SUBSCRIPTION_LIMIT",
          DEFAULT_ACTIVE_LIMIT,
        );
        const pendingLimit = configuredLimit(
          this.env,
          "PUSH_PENDING_SUBSCRIPTION_LIMIT",
          DEFAULT_PENDING_LIMIT,
        );
        const total = Number(
          firstRow(sql.exec("SELECT COUNT(*) AS count FROM push_registrations"))
            ?.count ?? 0,
        );
        const pending = Number(
          firstRow(
            sql.exec(
              "SELECT COUNT(*) AS count FROM push_registrations WHERE state = 'pending'",
            ),
          )?.count ?? 0,
        );
        if (total >= activeLimit || pending >= pendingLimit) {
          return json(
            { error: "Push subscription capacity reached." },
            { status: 429, headers: { "retry-after": "600" } },
          );
        }

        sql.exec(
          "INSERT INTO push_registrations (id, state, expires_at) VALUES (?, 'pending', ?)",
          body.id,
          now + PUSH_PENDING_TTL_SECONDS * 1_000,
        );
        created = true;
      } else {
        const ttl =
          state === "active"
            ? PUSH_ACTIVE_TTL_SECONDS
            : PUSH_PENDING_TTL_SECONDS;
        sql.exec(
          "UPDATE push_registrations SET expires_at = ? WHERE id = ?",
          now + ttl * 1_000,
          body.id,
        );
      }

      const previous =
        state === "active"
          ? parseStoredRecord(await store.get(activeKey(body.id)))
          : null;
      const record = {
        ...body.record,
        state,
        ...(state === "active"
          ? { verifiedAt: previous?.verifiedAt ?? new Date(now).toISOString() }
          : {}),
      };
      const ttl =
        state === "active"
          ? PUSH_ACTIVE_TTL_SECONDS
          : PUSH_PENDING_TTL_SECONDS;

      try {
        await store.put(
          state === "active" ? activeKey(body.id) : pendingKey(body.id),
          JSON.stringify(record),
          { expirationTtl: ttl },
        );
        await Promise.all([
          store.delete(
            state === "active" ? pendingKey(body.id) : activeKey(body.id),
          ),
          store.delete(legacyKey(body.id)),
        ]);
      } catch (error) {
        if (created) {
          sql.exec("DELETE FROM push_registrations WHERE id = ?", body.id);
        } else if (existing) {
          sql.exec(
            "UPDATE push_registrations SET expires_at = ? WHERE id = ?",
            existing.expires_at,
            body.id,
          );
        }
        throw error;
      }
      return json({ state, created }, { status: created ? 201 : 200 });
    }

    const existing = firstRow(
      sql.exec(
        "SELECT state, expires_at FROM push_registrations WHERE id = ?",
        body.id,
      ),
    );

    if (path === "/inspect") {
      return existing
        ? json({ state: existing.state })
        : json({ error: "Registration not found." }, { status: 404 });
    }

    if (path === "/promote") {
      if (existing?.state !== "pending") {
        return json({ error: "Pending registration not found." }, { status: 404 });
      }
      const raw = await store.get(pendingKey(body.id));
      const record = parseStoredRecord(raw);
      if (!record) {
        sql.exec("DELETE FROM push_registrations WHERE id = ?", body.id);
        return json({ error: "Pending registration not found." }, { status: 404 });
      }
      if (record.revision !== body.revision) {
        return json({ error: "Registration changed." }, { status: 409 });
      }

      const activatedAt = new Date(now).toISOString();
      const activeRecord = {
        ...record,
        state: "active",
        verifiedAt: record.verifiedAt ?? activatedAt,
        updatedAt: activatedAt,
      };
      sql.exec(
        "UPDATE push_registrations SET state = 'active', expires_at = ? WHERE id = ?",
        now + PUSH_ACTIVE_TTL_SECONDS * 1_000,
        body.id,
      );
      try {
        await store.put(activeKey(body.id), JSON.stringify(activeRecord), {
          expirationTtl: PUSH_ACTIVE_TTL_SECONDS,
        });
        await store.delete(pendingKey(body.id));
      } catch (error) {
        sql.exec(
          "UPDATE push_registrations SET state = 'pending', expires_at = ? WHERE id = ?",
          now + PUSH_PENDING_TTL_SECONDS * 1_000,
          body.id,
        );
        await store.delete(activeKey(body.id)).catch(() => undefined);
        throw error;
      }
      return json({ state: "active", created: false });
    }

    if (path === "/renew") {
      if (existing?.state !== "active") {
        return json({ error: "Active registration not found." }, { status: 404 });
      }
      const raw = await store.get(activeKey(body.id));
      const record = parseStoredRecord(raw);
      if (!record) {
        sql.exec("DELETE FROM push_registrations WHERE id = ?", body.id);
        return json({ error: "Active registration not found." }, { status: 404 });
      }
      if (record.revision !== body.revision) {
        return json({ error: "Registration changed." }, { status: 409 });
      }

      sql.exec(
        "UPDATE push_registrations SET expires_at = ? WHERE id = ?",
        now + PUSH_ACTIVE_TTL_SECONDS * 1_000,
        body.id,
      );
      try {
        await store.put(activeKey(body.id), raw, {
          expirationTtl: PUSH_ACTIVE_TTL_SECONDS,
        });
      } catch (error) {
        sql.exec(
          "UPDATE push_registrations SET expires_at = ? WHERE id = ?",
          existing.expires_at,
          body.id,
        );
        throw error;
      }
      return json({ state: "active", created: false });
    }

    if (path === "/release" || path === "/release-if-current") {
      if (path === "/release-if-current" && existing) {
        const raw = await store.get(
          existing.state === "active" ? activeKey(body.id) : pendingKey(body.id),
        );
        if (parseStoredRecord(raw)?.revision !== body.revision) {
          return json({ error: "Registration changed." }, { status: 409 });
        }
      }

      await Promise.all([
        store.delete(activeKey(body.id)),
        store.delete(pendingKey(body.id)),
        store.delete(legacyKey(body.id)),
      ]);
      sql.exec("DELETE FROM push_registrations WHERE id = ?", body.id);
      return json({ released: true });
    }

    return json({ error: "Not found." }, { status: 404 });
  }
}
