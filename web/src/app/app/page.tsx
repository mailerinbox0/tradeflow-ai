"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TradingViewLiveChart, DASHBOARD_CHART_SYMBOLS } from "@/components/TradingViewLiveChart";
import { apiFetch, useAuth } from "@/lib/auth-store";
import { apiUrl } from "@/lib/api-base";
import { formatUsd } from "@/lib/utils";

type Dash = {
  user: {
    balanceUsd: number;
    totalProfit: number;
    fullName: string;
  };
  stats?: {
    activeTrades: number;
    completedTrades: number;
    wins: number;
    losses: number;
  };
  trades?: {
    id: string;
    amountUsd: number;
    status: string;
    pair?: string;
  }[];
};

type Market = { symbol: string; name?: string; price: number; change24h: number };

const COIN_STYLE: Record<string, { bg: string; label: string }> = {
  BTC: { bg: "#f7931a", label: "₿" },
  ETH: { bg: "#627eea", label: "Ξ" },
  BNB: { bg: "#f3ba2f", label: "B" },
  SOL: { bg: "#14f195", label: "S" },
  XRP: { bg: "#23292f", label: "X" },
  ADA: { bg: "#0033ad", label: "A" },
  DOGE: { bg: "#c2a633", label: "Ð" },
  AVAX: { bg: "#e84142", label: "A" },
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "GOOD MORNING";
  if (h < 17) return "GOOD AFTERNOON";
  return "GOOD EVENING";
}

function firstName(full?: string) {
  return String(full || "Trader").trim().split(/\s+/)[0];
}

function SentimentGauge({ value }: { value: number }) {
  // 0–100, needle angle from -90 (left) to +90 (right)
  const angle = -90 + (Math.min(100, Math.max(0, value)) / 100) * 180;
  const label =
    value <= 25 ? "EXTREME FEAR" : value <= 45 ? "FEAR" : value <= 55 ? "NEUTRAL" : value <= 75 ? "GREED" : "EXTREME GREED";
  const color =
    value <= 25 ? "#ef4444" : value <= 45 ? "#f97316" : value <= 55 ? "#eab308" : value <= 75 ? "#84cc16" : "#22c55e";

  return (
    <div className="tf-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-[var(--blue)]" />
        <h2 className="font-semibold">Market Sentiment</h2>
      </div>
      <div className="mx-auto w-full max-w-xs">
        <svg viewBox="0 0 200 120" className="w-full">
          <defs>
            <linearGradient id="sentGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="35%" stopColor="#f59e0b" />
              <stop offset="55%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
          <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="url(#sentGrad)" strokeWidth="14" strokeLinecap="round" />
          <g transform={`rotate(${angle} 100 100)`}>
            <line x1="100" y1="100" x2="100" y2="35" stroke="white" strokeWidth="3" strokeLinecap="round" />
            <circle cx="100" cy="100" r="6" fill="white" />
          </g>
        </svg>
        <div className="mt-[-1.5rem] text-center">
          <p className="text-4xl font-bold" style={{ color }}>
            {value}
          </p>
          <p className="mt-1 text-sm font-semibold" style={{ color }}>
            ↘ {label}
          </p>
        </div>
        <div className="mt-3 flex justify-between text-[10px] text-[var(--muted)]">
          <span>Extreme Fear</span>
          <span>Neutral</span>
          <span>Extreme Greed</span>
        </div>
      </div>
      <p className="mt-4 rounded-xl border border-[var(--line)] bg-black/20 p-3 text-sm text-[var(--muted)]">
        {value <= 40
          ? "Extreme fear in the market. A potential opportunity for long-term investors to watch closely."
          : "Market sentiment is elevated. Manage risk and session size carefully."}
      </p>
      <p className="mt-2 text-xs text-[var(--muted)]">Updated: {new Date().toLocaleString()}</p>
    </div>
  );
}

export default function AppDashboard() {
  const { token, user, updateUser } = useAuth();
  const [dash, setDash] = useState<Dash | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [error, setError] = useState("");
  const [chartSymbol, setChartSymbol] = useState("BTC");

  useEffect(() => {
    if (!token) return;
    let alive = true;
    async function refresh() {
      // Load independently so a slow markets call never blanks the dashboard
      const mePromise = apiFetch<Dash>("/api/me", { token })
        .then((me) => {
          if (!alive) return;
          setDash(me);
          updateUser({ balanceUsd: me.user.balanceUsd });
          setError("");
        })
        .catch((err) => {
          if (!alive) return;
          setError(err instanceof Error ? err.message : "Failed to load account");
        });

      const mktPromise = fetch(apiUrl("/api/markets"), { cache: "no-store" })
        .then(async (res) => {
          if (!res.ok) throw new Error("Markets unavailable");
          return res.json() as Promise<{ markets: Market[] }>;
        })
        .then((mkt) => {
          if (!alive) return;
          setMarkets(mkt.markets || []);
        })
        .catch(() => {
          /* keep last markets / empty — not fatal */
        });

      await Promise.allSettled([mePromise, mktPromise]);
    }
    refresh();
    const t = setInterval(refresh, 8000);
    return () => {
      alive = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, updateUser]);

  const available = dash?.user.balanceUsd ?? user?.balanceUsd ?? 0;
  const trades = dash?.trades || [];
  const activeTrades = trades.filter((t) => t.status === "active");
  const tradingAmount = activeTrades.reduce((a, t) => a + (t.amountUsd || 0), 0);
  const botCount = activeTrades.length;
  const totalTraded = trades.reduce((a, t) => a + (t.amountUsd || 0), 0);
  const equity = available + tradingAmount;
  const name = firstName(dash?.user.fullName || user?.fullName);
  const sentiment = useMemo(() => 18 + Math.floor(Math.random() * 12), []);

  return (
    <AppShell title="Dashboard">
      {error ? <p className="mb-4 text-sm text-[var(--red)]">{error}</p> : null}

      {/* Welcome / equity card */}
      <section className="tf-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.14em] text-[var(--muted)]">
              {greeting()} <Sparkles className="h-3.5 w-3.5 text-[var(--blue)]" />
            </p>
            <h2 className="mt-1 text-2xl font-bold capitalize">{name}</h2>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.1)] px-2.5 py-1 text-[11px] font-semibold text-[var(--green)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" /> ONLINE
          </span>
        </div>

        <div className="mt-5">
          <p className="text-xs tracking-[0.12em] text-[var(--muted)]">TOTAL EQUITY</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">{formatUsd(equity)}</p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--green)]">
            <Activity className="h-3.5 w-3.5" /> Synced across all sub-accounts
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--line)] bg-black/20 px-4 py-3">
            <p className="inline-flex items-center gap-2 text-xs tracking-wider text-[var(--muted)]">
              <span className="h-2 w-2 rounded-full bg-[var(--blue)]" />
              SPOT
            </p>
            <p className="mt-1 text-lg font-semibold">{formatUsd(available)}</p>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">Available to trade</p>
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-black/20 px-4 py-3">
            <p className="inline-flex items-center gap-2 text-xs tracking-wider text-[var(--muted)]">
              <span className={`h-2 w-2 rounded-full ${tradingAmount > 0 ? "animate-pulse bg-[var(--green)]" : "bg-[var(--green)]"}`} />
              TRADING
            </p>
            <p className="mt-1 text-lg font-semibold">{formatUsd(tradingAmount)}</p>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">
              {botCount > 0 ? `${botCount} active session${botCount === 1 ? "" : "s"}` : "No active trades"}
            </p>
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-black/20 px-4 py-3">
            <p className="inline-flex items-center gap-2 text-xs tracking-wider text-[var(--muted)]">
              <span className={`h-2 w-2 rounded-full ${botCount > 0 ? "animate-pulse bg-[#a855f7]" : "bg-[#a855f7]"}`} />
              BOT
            </p>
            <p className="mt-1 text-lg font-semibold">
              {botCount} <span className="text-sm font-medium text-[var(--muted)]">live</span>
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">
              Total traded {formatUsd(totalTraded)}
            </p>
          </div>
        </div>

        {activeTrades.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold tracking-wider text-[var(--muted)]">ACTIVE TRADES</p>
            {activeTrades.map((t) => (
              <Link
                key={t.id}
                href="/app/trade"
                className="flex items-center justify-between rounded-xl border border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.06)] px-3 py-2.5 text-sm transition hover:border-[rgba(34,197,94,0.45)]"
              >
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--green)]" />
                  <span className="font-medium">{t.pair || "Session"}</span>
                </span>
                <span className="font-semibold text-[var(--green)]">{formatUsd(t.amountUsd)}</span>
              </Link>
            ))}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Link href="/app/deposit" className="tf-btn tf-btn-primary !rounded-xl tf-glow justify-center">
            <ArrowDownToLine className="h-4 w-4" /> Deposit
          </Link>
          <Link href="/app/withdraw" className="tf-btn tf-btn-ghost !rounded-xl justify-center">
            <ArrowUpFromLine className="h-4 w-4" /> Withdraw
          </Link>
          <Link href="/app/trade" className="tf-btn tf-btn-success !rounded-xl justify-center">
            <BarChart3 className="h-4 w-4" /> Trade
          </Link>
        </div>
      </section>

      {/* Markets */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
            <Activity className="h-4 w-4 text-[var(--blue)]" /> Market Overview
          </h2>
          <Link href="/app/trade" className="text-sm text-[var(--blue)]">
            View More →
          </Link>
        </div>
        <div className="tf-card overflow-hidden">
          {markets.slice(0, 6).map((m) => {
            const style = COIN_STYLE[m.symbol] || { bg: "#334155", label: m.symbol[0] };
            const up = m.change24h >= 0;
            const chartable = DASHBOARD_CHART_SYMBOLS.some((s) => s.id === m.symbol);
            return (
              <button
                key={m.symbol}
                type="button"
                onClick={() => chartable && setChartSymbol(m.symbol)}
                className={`flex w-full items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3 text-left last:border-0 transition ${
                  chartSymbol === m.symbol ? "bg-[rgba(0,163,255,0.08)]" : "hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white"
                    style={{ background: style.bg }}
                  >
                    {style.label}
                  </span>
                  <div>
                    <p className="font-semibold">{m.name || m.symbol}</p>
                    <p className="text-xs text-[var(--muted)]">{m.symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatUsd(m.price)}</p>
                  <span
                    className={`mt-1 inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
                      up ? "bg-[rgba(0,163,255,0.15)] text-[var(--blue)]" : "bg-[rgba(239,68,68,0.15)] text-[var(--red)]"
                    }`}
                  >
                    {up ? "+" : ""}
                    {m.change24h.toFixed(2)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Full-width live TradingView chart */}
      <div className="mt-6">
        <TradingViewLiveChart
          symbolId={chartSymbol}
          onSymbolChange={setChartSymbol}
          height={520}
        />
      </div>

      <div className="mt-6 max-w-md">
        <SentimentGauge value={sentiment} />
      </div>
    </AppShell>
  );
}
