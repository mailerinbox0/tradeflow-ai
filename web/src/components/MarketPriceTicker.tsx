"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-base";

type Market = { symbol: string; price: number; change24h: number };

function money(n: number) {
  if (n >= 100) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function MarketPriceTicker() {
  const [markets, setMarkets] = useState<Market[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(apiUrl("/api/markets"));
        const data = await res.json();
        if (alive) setMarkets(data.markets || []);
      } catch {
        /* ignore */
      }
    };
    load();
    const t = setInterval(load, 20_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const fallback: Market[] = [
    { symbol: "BTC", price: 68420, change24h: 2.1 },
    { symbol: "ETH", price: 3521, change24h: -0.8 },
    { symbol: "SOL", price: 178, change24h: 4.2 },
    { symbol: "BNB", price: 589, change24h: 1.8 },
    { symbol: "XRP", price: 0.62, change24h: -0.5 },
  ];
  const list = markets.length ? markets : fallback;
  const strip = [...list, ...list];

  return (
    <div className="overflow-hidden border-y border-[var(--line)] bg-black/60">
      <div className="tf-ticker flex w-max gap-10 whitespace-nowrap px-4 py-2 text-xs sm:text-sm">
        {strip.map((m, i) => (
          <span key={`${m.symbol}-${i}`} className="inline-flex items-center gap-2 text-[var(--muted)]">
            <strong className="text-white">{m.symbol}</strong>
            <span>${money(m.price)}</span>
            <span className={m.change24h >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}>
              {m.change24h >= 0 ? "+" : ""}
              {m.change24h.toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
