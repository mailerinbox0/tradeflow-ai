"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, Timer } from "lucide-react";
import { formatUsd } from "@/lib/utils";
import { computeLiveTradeSnapshot } from "@/lib/live-trade-path";

type ActiveTrade = {
  id: string;
  pair: string;
  amountUsd: number;
  durationSeconds: number;
  startedAt?: string;
  endsAt: string;
  entryPrice?: number;
  side?: "buy" | "sell";
};

function fmtPrice(n: number) {
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

export function LiveTradeSessionView({
  trade,
  pairLabel,
}: {
  trade: ActiveTrade;
  pairLabel: string;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 400);
    return () => clearInterval(t);
  }, [trade.id]);

  const snap = useMemo(() => computeLiveTradeSnapshot(trade, now), [trade, now]);
  const up = snap.unrealizedPnl >= 0;
  const w = 320;
  const h = 140;
  const pad = 8;

  const points = snap.path;
  const prices = points.map((p) => p.price);
  const pnls = points.map((p) => p.pnl);
  const minP = Math.min(...prices, snap.entryPrice);
  const maxP = Math.max(...prices, snap.entryPrice);
  const minN = Math.min(...pnls, 0);
  const maxN = Math.max(...pnls, 0);
  const spanP = Math.max(1e-9, maxP - minP);
  const spanN = Math.max(1e-9, maxN - minN);

  const priceLine = points
    .map((p, i) => {
      const x = pad + (i / Math.max(1, points.length - 1)) * (w - pad * 2);
      const y = pad + (1 - (p.price - minP) / spanP) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const pnlLine = points
    .map((p, i) => {
      const x = pad + (i / Math.max(1, points.length - 1)) * (w - pad * 2);
      const y = pad + (1 - (p.pnl - minN) / spanN) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const entryY =
    pad + (1 - (snap.entryPrice - minP) / spanP) * (h - pad * 2);
  const zeroY = pad + (1 - (0 - minN) / spanN) * (h - pad * 2);

  return (
    <section className="tf-card space-y-4 overflow-hidden p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="inline-flex items-center gap-2 font-semibold">
            <Activity className="h-4 w-4 text-[var(--green)]" />
            Live trade session
          </h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {pairLabel} · {snap.side.toUpperCase()} · stake {formatUsd(trade.amountUsd)}
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${
            up
              ? "bg-[rgba(34,197,94,0.15)] text-[var(--green)]"
              : "bg-[rgba(239,68,68,0.15)] text-[var(--red)]"
          }`}
        >
          {up ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
          {up ? "+" : ""}
          {formatUsd(snap.unrealizedPnl)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--line)] bg-black/20 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Entry</p>
          <p className="font-mono text-sm font-semibold">{fmtPrice(snap.entryPrice)}</p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-black/20 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Mark</p>
          <p className={`font-mono text-sm font-semibold ${up ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
            {fmtPrice(snap.markPrice)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-black/20 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Session H / L</p>
          <p className="font-mono text-xs font-semibold">
            {fmtPrice(snap.sessionHigh)} / {fmtPrice(snap.sessionLow)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-black/20 px-3 py-2">
          <p className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--muted)]">
            <Timer className="h-3 w-3" /> Time left
          </p>
          <p className="font-mono text-sm font-semibold">{snap.remainingSec}s</p>
        </div>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-[10px] text-[var(--muted)]">
          <span>Session progress</span>
          <span>{Math.round(snap.progress * 100)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[var(--green)] transition-all duration-300"
            style={{ width: `${Math.min(100, snap.progress * 100)}%` }}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--line)] bg-[#030712] p-3">
          <p className="mb-2 text-[10px] uppercase tracking-wider text-[var(--muted)]">
            Price path vs entry
          </p>
          <svg viewBox={`0 0 ${w} ${h}`} className="h-36 w-full" role="img" aria-label="Price path">
            <line
              x1={pad}
              x2={w - pad}
              y1={entryY}
              y2={entryY}
              stroke="rgba(255,255,255,0.25)"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <path d={priceLine} fill="none" stroke="var(--blue)" strokeWidth="2" />
            {points.length ? (
              <circle
                cx={pad + ((points.length - 1) / Math.max(1, points.length - 1)) * (w - pad * 2)}
                cy={
                  pad +
                  (1 - (points[points.length - 1].price - minP) / spanP) * (h - pad * 2)
                }
                r="4"
                fill={up ? "var(--green)" : "var(--red)"}
              />
            ) : null}
          </svg>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[#030712] p-3">
          <p className="mb-2 text-[10px] uppercase tracking-wider text-[var(--muted)]">
            Unrealized P/L movement
          </p>
          <svg viewBox={`0 0 ${w} ${h}`} className="h-36 w-full" role="img" aria-label="PnL path">
            <line
              x1={pad}
              x2={w - pad}
              y1={zeroY}
              y2={zeroY}
              stroke="rgba(255,255,255,0.2)"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <path
              d={pnlLine}
              fill="none"
              stroke={up ? "var(--green)" : "var(--red)"}
              strokeWidth="2"
            />
            {points.length ? (
              <circle
                cx={pad + ((points.length - 1) / Math.max(1, points.length - 1)) * (w - pad * 2)}
                cy={
                  pad +
                  (1 - (points[points.length - 1].pnl - minN) / spanN) * (h - pad * 2)
                }
                r="4"
                fill={up ? "var(--green)" : "var(--red)"}
              />
            ) : null}
          </svg>
        </div>
      </div>

      <p className="text-[11px] text-[var(--muted)]">
        Watching AI session ticks in real time — entry, mark, and floating P/L update as the market path
        moves until settlement.
      </p>
    </section>
  );
}
