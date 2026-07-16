/**
 * Durable persistence for the in-memory demo store via Postgres `app_runtime_state`.
 * Uses DATABASE_URL (direct Postgres) — works with Supabase pooler URLs on Fly.
 */
import pg from "pg";

const STATE_ID = "main";

let hydrated = false;
let hydrating: Promise<void> | null = null;
let loopStarted = false;
let pool: pg.Pool | null = null;

export function isPersistConfigured() {
  const url = process.env.DATABASE_URL || "";
  return Boolean(url && !url.includes("localhost") && url.startsWith("postgres"));
}

function getPool() {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes("supabase.com")
        ? { rejectUnauthorized: false }
        : undefined,
      max: 2,
    });
  }
  return pool;
}

export function markStoreDirty() {
  /* no-op kept for callers — loop saves on interval */
}

export function ensurePersistLoop(getPayload: () => unknown, setPayload: (data: unknown) => void) {
  if (!isPersistConfigured()) return;
  if (!hydrated && !hydrating) {
    hydrating = hydrate(getPayload, setPayload).finally(() => {
      hydrating = null;
    });
  }
  if (loopStarted) return;
  loopStarted = true;
  setInterval(() => {
    void flush(getPayload).catch(() => undefined);
  }, 12_000);
}

async function hydrate(getPayload: () => unknown, setPayload: (data: unknown) => void) {
  try {
    const client = getPool();
    const { rows } = await client.query<{ payload: unknown }>(
      "SELECT payload FROM public.app_runtime_state WHERE id = $1 LIMIT 1",
      [STATE_ID],
    );
    const row = rows[0];
    const payload = row?.payload;
    if (isValidStorePayload(payload)) {
      setPayload(payload);
      console.info("[persist] hydrated demo-store from Postgres");
    } else if (payload && typeof payload === "object") {
      console.warn("[persist] ignoring invalid stored payload — re-seeding");
      const fresh = JSON.parse(JSON.stringify(getPayload())) as object;
      await client.query(
        `INSERT INTO public.app_runtime_state (id, payload, updated_at)
         VALUES ($1, $2::jsonb, now())
         ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
        [STATE_ID, JSON.stringify(fresh)],
      );
    } else {
      const fresh = JSON.parse(JSON.stringify(getPayload())) as object;
      await client.query(
        `INSERT INTO public.app_runtime_state (id, payload, updated_at)
         VALUES ($1, $2::jsonb, now())
         ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
        [STATE_ID, JSON.stringify(fresh)],
      );
    }
  } catch (e) {
    console.warn("[persist] hydrate error:", e instanceof Error ? e.message : e);
  } finally {
    hydrated = true;
  }
}

function isValidStorePayload(payload: unknown): payload is Record<string, unknown> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const p = payload as Record<string, unknown>;
  return (
    Array.isArray(p.users) &&
    p.users.length > 0 &&
    typeof p.sessions === "object" &&
    p.sessions !== null &&
    Array.isArray(p.activities)
  );
}

async function flush(getPayload: () => unknown) {
  if (!isPersistConfigured() || !hydrated) return;
  try {
    const payload = JSON.parse(JSON.stringify(getPayload())) as object;
    const client = getPool();
    await client.query(
      `INSERT INTO public.app_runtime_state (id, payload, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
      [STATE_ID, JSON.stringify(payload)],
    );
  } catch (e) {
    console.warn("[persist] save error:", e instanceof Error ? e.message : e);
  }
}

export async function flushStoreToPostgres(getPayload: () => unknown) {
  await flush(getPayload);
}
