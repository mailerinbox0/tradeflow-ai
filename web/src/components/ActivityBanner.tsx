"use client";

import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/api-base";

type Item = {
  id: string;
  message: string;
  amountUsd?: number;
  amountLabel?: string;
};

const WINDOW = 40;
const ROTATE_MS = 90_000;

const FALLBACK: Item[] = [
  { id: "fb-1", message: "Platform markets are open" },
  { id: "fb-2", message: "AI engine monitoring live pairs" },
  { id: "fb-3", message: "James A. funded account", amountLabel: "$150" },
  { id: "fb-4", message: "Sofia A. withdrew BTC", amountLabel: "$8,069" },
];

function normalizeItems(raw: unknown): Item[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is Item => Boolean(row && typeof row === "object" && String((row as Item).message || "").trim()))
    .map((row) => ({
      id: String(row.id || Math.random()),
      message: String(row.message),
      amountUsd: row.amountUsd,
      amountLabel: row.amountLabel,
    }));
}

export function ActivityBanner() {
  const [items, setItems] = useState<Item[]>(FALLBACK);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(apiUrl("/api/activity"), { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const next = normalizeItems(data?.items);
        if (alive && next.length) setItems(next);
      } catch {
        /* keep fallback */
      }
    }
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (items.length <= WINDOW) return;
    const t = setInterval(() => {
      setOffset((o) => (o + WINDOW) % items.length);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [items.length]);

  const batch = useMemo(() => {
    const pool = items.length ? items : FALLBACK;
    if (pool.length <= WINDOW) return pool;
    const out: Item[] = [];
    for (let i = 0; i < WINDOW; i++) out.push(pool[(offset + i) % pool.length]);
    return out;
  }, [items, offset]);

  const strip = useMemo(() => [...batch, ...batch], [batch]);

  return (
    <div className="shrink-0 overflow-hidden border-y border-[var(--line)] bg-[rgba(11,20,40,0.85)]">
      <div className="tf-ticker-activity flex w-max min-w-full gap-12 whitespace-nowrap px-4 py-2.5 text-sm">
        {strip.map((item, i) => {
          const label =
            item.amountLabel ||
            (item.amountUsd != null ? `$${item.amountUsd.toLocaleString("en-US")}` : null);
          return (
            <span key={`${item.id}-${i}`} className="inline-flex shrink-0 items-center text-[var(--muted)]">
              <span className="mr-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--green)]" />
              {item.message}
              {label ? <span className="ml-2 font-medium text-[var(--green)]">{label}</span> : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
