"use client";

import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/api-base";

type Item = {
  id: string;
  message: string;
  amountUsd?: number;
  amountLabel?: string;
};

const WINDOW = 40; // visible marquee batch — keeps scroll readable
const ROTATE_MS = 90_000; // refresh names from the 1000 pool

export function ActivityBanner() {
  const [items, setItems] = useState<Item[]>([]);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/activity"));
        const data = await res.json();
        if (alive) setItems(data.items || []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (items.length <= WINDOW) return;
    const t = setInterval(() => {
      setOffset((o) => (o + WINDOW) % items.length);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [items.length]);

  const batch = useMemo(() => {
    if (!items.length) {
      return [
        { id: "1", message: "Platform markets are open" },
        { id: "2", message: "AI engine monitoring live pairs" },
      ];
    }
    if (items.length <= WINDOW) return items;
    const out: Item[] = [];
    for (let i = 0; i < WINDOW; i++) {
      out.push(items[(offset + i) % items.length]);
    }
    return out;
  }, [items, offset]);

  // Duplicate once for seamless loop
  const strip = [...batch, ...batch];

  return (
    <div className="overflow-hidden border-y border-[var(--line)] bg-[rgba(11,20,40,0.85)]">
      <div className="tf-ticker-activity flex w-max gap-12 whitespace-nowrap px-4 py-2.5 text-sm">
        {strip.map((item, i) => {
          const label =
            item.amountLabel ||
            (item.amountUsd != null
              ? `$${item.amountUsd.toLocaleString("en-US")}`
              : null);
          return (
            <span key={`${item.id}-${i}`} className="inline-flex items-center text-[var(--muted)]">
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
