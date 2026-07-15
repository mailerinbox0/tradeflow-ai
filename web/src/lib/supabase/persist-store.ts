/**
 * Durable persistence for the in-memory demo store via Supabase `app_runtime_state`.
 * Enables Fly.io restarts without wiping demo data (single-machine).
 */
import { createServiceSupabase, isSupabaseServiceConfigured } from "@/lib/supabase/server";

const STATE_ID = "main";

let hydrated = false;
let hydrating: Promise<void> | null = null;
let loopStarted = false;

export function markStoreDirty() {
  /* no-op kept for callers — loop saves on interval */
}

export function ensurePersistLoop(getPayload: () => unknown, setPayload: (data: unknown) => void) {
  if (!isSupabaseServiceConfigured()) return;
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
    const sb = createServiceSupabase();
    const { data, error } = await sb
      .from("app_runtime_state")
      .select("payload")
      .eq("id", STATE_ID)
      .maybeSingle();
    if (error) {
      console.warn("[persist] hydrate failed:", error.message);
      hydrated = true;
      return;
    }
    if (data?.payload && typeof data.payload === "object") {
      setPayload(data.payload);
      console.info("[persist] hydrated demo-store from Supabase");
    } else {
      await sb.from("app_runtime_state").upsert({
        id: STATE_ID,
        payload: JSON.parse(JSON.stringify(getPayload())) as object,
        updated_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn("[persist] hydrate error:", e instanceof Error ? e.message : e);
  } finally {
    hydrated = true;
  }
}

async function flush(getPayload: () => unknown) {
  if (!isSupabaseServiceConfigured() || !hydrated) return;
  try {
    const payload = JSON.parse(JSON.stringify(getPayload())) as object;
    const sb = createServiceSupabase();
    const { error } = await sb.from("app_runtime_state").upsert({
      id: STATE_ID,
      payload,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn("[persist] save failed:", error.message);
    }
  } catch (e) {
    console.warn("[persist] save error:", e instanceof Error ? e.message : e);
  }
}

export async function flushStoreToSupabase(getPayload: () => unknown) {
  await flush(getPayload);
}
