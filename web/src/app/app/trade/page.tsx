"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Brain,
  Pause,
  Play,
  Square,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LiveTradeSessionView } from "@/components/LiveTradeSessionView";
import {
  TradingViewLiveChart,
  chartSymbolIdForTradePair,
} from "@/components/TradingViewLiveChart";
import { apiFetch, useAuth } from "@/lib/auth-store";
import { BOT_CYCLE_SESSION_CAP, TRADE_PAIR_LABELS } from "@/lib/constants";
import { formatUsd } from "@/lib/utils";

type Trade = {
  id: string;
  pair: string;
  amountUsd: number;
  durationSeconds: number;
  status: string;
  resultPnl: number;
  startedAt?: string;
  endsAt: string;
  entryPrice?: number;
  side?: "buy" | "sell";
};

type EngineState = "standby" | "ready" | "running" | "paused" | "stopped";

type LogLine = { id: string; text: string; tone?: "dim" | "ok" | "bad" | "info" };

function pairLabel(pair: string, labels: Record<string, string>) {
  return labels[pair] || TRADE_PAIR_LABELS[pair] || pair;
}

function fmtPnl(n: number) {
  const sign = n > 0 ? "+" : n < 0 ? "" : "+";
  return `${sign}${formatUsd(n)}`;
}

export default function TradePage() {
  const router = useRouter();
  const { token, updateUser } = useAuth();
  const [balance, setBalance] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [pairs, setPairs] = useState<string[]>([]);
  const [pairLabels, setPairLabels] = useState<Record<string, string>>({});
  const [durations, setDurations] = useState<{ label: string; seconds: number }[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [pair, setPair] = useState("XAU/USD");
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState(60);
  const [error, setError] = useState("");
  const [maxLossPct, setMaxLossPct] = useState(10);
  const [engine, setEngine] = useState<EngineState>("standby");
  const [cycleCount, setCycleCount] = useState(0);
  const [cycleCap, setCycleCap] = useState(BOT_CYCLE_SESSION_CAP);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [now, setNow] = useState(Date.now());
  const consoleRef = useRef<HTMLDivElement>(null);
  const autoChainRef = useRef(false);
  const lastSettledRef = useRef<string>("");

  const pushLog = useCallback((text: string, tone?: LogLine["tone"]) => {
    setLogs((prev) => {
      const next = [...prev, { id: `${Date.now()}-${Math.random()}`, text, tone }];
      return next.slice(-80);
    });
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    const data = await apiFetch<{
      balanceUsd: number;
      availableUsd?: number;
      activeSessions?: number;
      trades: Trade[];
      pairs: string[];
      pairLabels?: Record<string, string>;
      durations: { label: string; seconds: number }[];
      maxLossPct: number;
      cycleSessionCap?: number;
    }>("/api/trades", { token });
    setBalance(data.availableUsd ?? data.balanceUsd);
    setActiveCount(data.activeSessions ?? data.trades.filter((t) => t.status === "active").length);
    setTrades(data.trades);
    setPairs(data.pairs);
    setPairLabels(data.pairLabels || {});
    setDurations(data.durations);
    setMaxLossPct(data.maxLossPct);
    if (data.cycleSessionCap) setCycleCap(data.cycleSessionCap);
    updateUser({ balanceUsd: data.balanceUsd });
    if (data.pairs.length && !data.pairs.includes(pair)) {
      setPair(data.pairs[0]);
    }
    return data;
  }, [token, updateUser, pair]);

  useEffect(() => {
    if (!token) {
      router.replace("/auth/login");
      return;
    }
    load().catch((err) => setError(err.message));
    const t = setInterval(() => {
      load().catch(() => undefined);
      setNow(Date.now());
    }, 2000);
    return () => clearInterval(t);
  }, [token, router, load]);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  const closed = useMemo(
    () => trades.filter((t) => t.status === "won" || t.status === "lost"),
    [trades],
  );
  const actives = useMemo(() => trades.filter((t) => t.status === "active"), [trades]);
  const active = actives[0] || null;
  const isLiveTrading = actives.length > 0 || engine === "running";
  const chartPair = active?.pair || pair;
  const chartSymbolId = chartSymbolIdForTradePair(chartPair);
  const wins = closed.filter((t) => t.status === "won").length;
  const losses = closed.filter((t) => t.status === "lost").length;
  const runPnl = closed.reduce((a, t) => a + (t.resultPnl || 0), 0);
  const sessions = closed.length;
  const winPct = sessions ? Math.round((wins / sessions) * 100) : 0;
  const winShare = sessions ? (wins / sessions) * 100 : 50;

  // Live console ticks while running
  useEffect(() => {
    if (!active || engine !== "running") return;
    const ticks = [
      `scanning ${active.pair} liquidity…`,
      `entry bias recalculated · stake ${formatUsd(active.amountUsd)}`,
      `risk cap ${maxLossPct}% · monitoring spreads`,
      `heartbeat ok · session ${active.id.slice(-6)}`,
      `signal window open · waiting settlement`,
    ];
    let i = 0;
    const t = setInterval(() => {
      const left = Math.max(0, Math.ceil((new Date(active.endsAt).getTime() - Date.now()) / 1000));
      pushLog(`[live] ${ticks[i % ticks.length]} · ${left}s remaining`, "info");
      i += 1;
    }, 3500);
    return () => clearInterval(t);
  }, [active, engine, maxLossPct, pushLog]);

  // Detect settlement → log + optionally chain next session in cycle
  useEffect(() => {
    if (!active && engine === "running") {
      const latest = closed[0];
      if (latest && latest.id !== lastSettledRef.current) {
        lastSettledRef.current = latest.id;
        const ok = latest.status === "won";
        pushLog(
          `session closed · ${latest.pair} · ${ok ? "WIN" : "LOSS"} ${fmtPnl(latest.resultPnl)}`,
          ok ? "ok" : "bad",
        );
        if (autoChainRef.current && cycleCount < cycleCap && balance > 0 && Number(amount) > 0) {
          // continue cycle if still configured
          startSession(true).catch(() => undefined);
        } else if (cycleCount >= cycleCap) {
          setEngine("stopped");
          autoChainRef.current = false;
          pushLog(`cycle limit reached (${cycleCap}). Stop or Start a new cycle.`, "dim");
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, closed, engine, cycleCount, cycleCap, balance]);

  async function startSession(chained = false) {
    setError("");
    if (balance <= 0) {
      setError("No available balance — wait for a session to finish or deposit more");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Enter a trade amount");
      return;
    }
    if (Number(amount) > balance) {
      setError(`Amount exceeds available balance (${formatUsd(balance)})`);
      return;
    }
    if (engine === "paused") {
      setEngine("running");
      pushLog("engine resumed", "ok");
      return;
    }
    if (cycleCount >= cycleCap && !chained) {
      setError(`Cycle limit ${cycleCap} reached — press Stop to reset`);
      return;
    }

    try {
      if (!chained) {
        setEngine("running");
        pushLog(`tradeflow@ai-engine:~$ start --pair ${pair} --stake ${amount}`, "dim");
        pushLog(
          `session queued · ${pairLabel(pair, pairLabels)} · ${duration}s · continues if you leave this page`,
          "info",
        );
      } else {
        pushLog(`chaining next session · ${pair}`, "info");
      }
      await apiFetch("/api/trades", {
        method: "POST",
        token,
        body: JSON.stringify({
          pair,
          amountUsd: Number(amount),
          durationSeconds: duration,
        }),
      });
      setCycleCount((c) => c + 1);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      if (!actives.length) setEngine("ready");
    }
  }

  function onPause() {
    if (engine !== "running") return;
    setEngine("paused");
    pushLog("engine paused — active session continues until settle", "dim");
  }

  async function onStop() {
    setError("");
    autoChainRef.current = false;
    try {
      if (actives.length) {
        await apiFetch("/api/trades", {
          method: "PATCH",
          token,
          body: JSON.stringify({ action: "stop" }),
        });
        pushLog(`STOP · ${actives.length} session(s) aborted · stakes returned`, "bad");
      } else {
        pushLog("STOP · engine standby", "dim");
      }
      setEngine("standby");
      setCycleCount(0);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stop failed");
    }
  }

  const statusLabel =
    actives.length > 0 || engine === "running"
      ? "RUNNING"
      : engine === "paused"
        ? "PAUSED"
        : engine === "stopped"
          ? "STOPPED"
          : balance > 0
            ? "STANDBY"
            : "LOCKED";

  const statusSub =
    actives.length > 0
      ? `${actives.length} live session(s) · settles even if you leave · available ${formatUsd(balance)}`
      : engine === "paused"
        ? "Paused — tap Start to resume controls"
        : balance <= 0
          ? "Deposit required to unlock"
          : "Standby — configure to start";

  return (
    <AppShell title="AI Trading Bot">
      <div className="mx-auto max-w-2xl space-y-5">
        {/* Engine status */}
        <section className="tf-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[rgba(0,163,255,0.15)] text-[var(--blue)]">
                <Brain className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold">TradeFlow AI Engine</h2>
                <p className="text-sm text-[var(--muted)]">{statusSub}</p>
              </div>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-[11px] font-bold tracking-wide ${
                engine === "running"
                  ? "border-[rgba(34,197,94,0.4)] bg-[rgba(34,197,94,0.12)] text-[var(--green)]"
                  : engine === "paused"
                    ? "border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.12)] text-[var(--amber)]"
                    : "border-[var(--line)] bg-white/5 text-[var(--muted)]"
              }`}
            >
              {statusLabel}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] tracking-[0.14em] text-[var(--muted)]">RUN P/L</p>
              <p
                className={`mt-1 text-4xl font-bold tracking-tight ${
                  runPnl > 0 ? "text-[var(--green)]" : runPnl < 0 ? "text-[var(--red)]" : "text-white"
                }`}
              >
                {fmtPnl(runPnl)}
              </p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                across {sessions} sessions • {wins}W / {losses}L
              </p>
            </div>
            <div className="relative grid h-24 w-24 place-items-center">
              <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="var(--green)"
                  strokeWidth="3"
                  strokeDasharray={`${(winPct / 100) * 97.4} 97.4`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-center">
                <p className="text-xs font-bold text-[var(--green)]">WIN</p>
                <p className="text-lg font-bold">{winPct}%</p>
              </div>
            </div>
          </div>
        </section>

        {/* Ready banner */}
        {balance > 0 && engine !== "running" ? (
          <div className="flex items-center gap-2 rounded-xl border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.08)] px-4 py-3 text-sm text-[var(--green)]">
            <span className="h-2 w-2 rounded-full bg-[var(--green)]" />
            Ready to Trade. Pick a pair, set your stake, and tap Start.
          </div>
        ) : null}

        {balance <= 0 ? (
          <div className="tf-card p-5 text-center">
            <p className="font-semibold">No available balance</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Deposit funds to unlock the AI trading bot.</p>
            <Link href="/app/deposit" className="tf-btn tf-btn-primary mt-4">
              Deposit now
            </Link>
          </div>
        ) : (
          <section className="tf-card space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Session Config</h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-[var(--muted)]">
                  Live{" "}
                  <strong className="text-white">{activeCount || actives.length}</strong>
                  {" · "}
                  Cycle{" "}
                  <strong className="text-white">
                    {cycleCount}/{cycleCap}
                  </strong>
                </span>
                <span className="rounded-full bg-[rgba(34,197,94,0.12)] px-2 py-0.5 font-semibold text-[var(--green)]">
                  {actives.length ? "Live" : "Ready"}
                </span>
              </div>
            </div>

            <div>
              <label className="tf-label">Trading pair</label>
              <select
                className="tf-input"
                value={pair}
                onChange={(e) => setPair(e.target.value)}
              >
                {pairs.map((p) => (
                  <option key={p} value={p}>
                    {pairLabel(p, pairLabels)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span className="tf-label !mb-0">TRADE AMOUNT (USD)</span>
                <span className="text-[var(--muted)]">Available: {formatUsd(balance)}</span>
              </div>
              <input
                className="tf-input"
                type="number"
                min={1}
                step="0.01"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                Sessions keep running if you leave. Stake locks from available balance only.
              </p>
            </div>

            <div>
              <label className="tf-label">Session duration</label>
              <select
                className="tf-input"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              >
                {durations.map((d) => (
                  <option key={d.seconds} value={d.seconds}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-[var(--muted)]">Max loss per trade is capped at {maxLossPct}% of stake.</p>
            {error ? <p className="text-sm text-[var(--red)]">{error}</p> : null}

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className="tf-btn tf-btn-success !rounded-xl"
                disabled={cycleCount >= cycleCap && engine !== "paused"}
                onClick={() => startSession(false)}
              >
                <Play className="h-4 w-4" /> Start
              </button>
              <button
                type="button"
                className="tf-btn tf-btn-ghost !rounded-xl"
                disabled={!actives.length && engine !== "running"}
                onClick={onPause}
              >
                <Pause className="h-4 w-4" /> Pause
              </button>
              <button
                type="button"
                className="tf-btn tf-btn-ghost !rounded-xl"
                disabled={engine === "standby" && !actives.length}
                onClick={onStop}
              >
                <Square className="h-4 w-4" /> Stop
              </button>
            </div>
          </section>
        )}

        {/* Live TradingView — syncs to the AI session pair while trading */}
        <section className="space-y-2">
          {isLiveTrading ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.08)] px-4 py-3 text-sm">
              <div className="inline-flex items-center gap-2 text-[var(--green)]">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--green)] opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--green)]" />
                </span>
                AI is trading {pairLabel(chartPair, pairLabels)} live
              </div>
              {active ? (
                <p className="text-xs text-[var(--muted)]">
                  Stake {formatUsd(active.amountUsd)} ·{" "}
                  {Math.max(0, Math.ceil((new Date(active.endsAt).getTime() - now) / 1000))}s left
                </p>
              ) : null}
            </div>
          ) : null}

          {active ? (
            <LiveTradeSessionView
              trade={active}
              pairLabel={pairLabel(active.pair, pairLabels)}
            />
          ) : null}

          <TradingViewLiveChart
            key={chartSymbolId}
            symbolId={chartSymbolId}
            height={isLiveTrading ? 480 : 380}
            liveTrading={isLiveTrading}
            liveLabel={
              isLiveTrading
                ? `AI · ${pairLabel(chartPair, pairLabels)} · 1m`
                : undefined
            }
          />
        </section>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="tf-card p-3">
            <p className="inline-flex items-center gap-1.5 text-[10px] tracking-wider text-[var(--muted)]">
              <Wallet className="h-3 w-3" /> BALANCE
            </p>
            <p className="mt-1 text-lg font-bold">{formatUsd(balance)}</p>
          </div>
          <div className="tf-card p-3">
            <p className="inline-flex items-center gap-1.5 text-[10px] tracking-wider text-[var(--muted)]">
              <Activity className="h-3 w-3 text-[var(--green)]" /> WINS
            </p>
            <p className="mt-1 text-lg font-bold text-[var(--green)]">{wins}</p>
          </div>
          <div className="tf-card p-3">
            <p className="inline-flex items-center gap-1.5 text-[10px] tracking-wider text-[var(--muted)]">
              <AlertTriangle className="h-3 w-3 text-[var(--red)]" /> LOSSES
            </p>
            <p className="mt-1 text-lg font-bold text-[var(--red)]">{losses}</p>
          </div>
        </div>

        {/* Wins / losses bar */}
        <div className="tf-card px-4 py-3">
          <div className="mb-2 flex items-center justify-between text-xs text-[var(--muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" /> wins
            </span>
            <span className="font-semibold tracking-wider text-white">{sessions} SESSIONS</span>
            <span className="inline-flex items-center gap-1.5">
              losses <span className="h-1.5 w-1.5 rounded-full bg-[var(--red)]" />
            </span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-white/5">
            <div className="bg-[var(--green)] transition-all" style={{ width: `${winShare}%` }} />
            <div className="bg-[var(--red)] transition-all" style={{ width: `${100 - winShare}%` }} />
          </div>
        </div>

        {/* Live console / session */}
        <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[#030712]">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
              <span className="ml-2 font-mono text-xs text-[var(--muted)]">tradeflow@ai-engine:~$</span>
            </div>
            <span className="font-mono text-[10px] text-[var(--muted)]">{logs.length} lines</span>
          </div>

          <div ref={consoleRef} className="h-52 overflow-y-auto px-4 py-4 font-mono text-xs sm:h-56">
            {!active && logs.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Activity className="h-8 w-8 text-[var(--blue)] opacity-50" />
                <p className="mt-3 text-sm text-white">Awaiting session start..</p>
                <p className="mt-1 text-[var(--muted)]">Live trade execution will stream here</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {actives.length ? (
                  <>
                    <p className="text-[var(--blue)]">● {actives.length} LIVE session(s)</p>
                    {actives.map((a) => {
                      const left = Math.max(0, Math.ceil((new Date(a.endsAt).getTime() - now) / 1000));
                      return (
                        <p key={a.id} className="text-[var(--muted)]">
                          {a.pair} · {formatUsd(a.amountUsd)} · {left}s left
                        </p>
                      );
                    })}
                  </>
                ) : null}
                {logs.map((l) => (
                  <p
                    key={l.id}
                    className={
                      l.tone === "ok"
                        ? "text-[var(--green)]"
                        : l.tone === "bad"
                          ? "text-[var(--red)]"
                          : l.tone === "info"
                            ? "text-[var(--blue)]"
                            : "text-[var(--muted)]"
                    }
                  >
                    {l.text}
                  </p>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Closed trades */}
        <section className="tf-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="inline-flex items-center gap-2 font-semibold">
              <TrendingUp className="h-4 w-4 text-[var(--blue)]" /> Closed Trades
            </h3>
            <span className="text-xs text-[var(--muted)]">{closed.length} TOTAL</span>
          </div>

          {closed.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <TrendingUp className="h-10 w-10 text-[var(--muted)] opacity-40" />
              <p className="mt-3 font-medium">No closed trades yet</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Completed trades will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {closed.slice(0, 20).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-black/20 px-3 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold">{t.pair}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {formatUsd(t.amountUsd)} · {t.status.toUpperCase()}
                      {t.startedAt
                        ? ` · ${new Date(t.startedAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`
                        : ""}
                    </p>
                  </div>
                  <span className={t.resultPnl >= 0 ? "font-semibold text-[var(--green)]" : "font-semibold text-[var(--red)]"}>
                    {fmtPnl(t.resultPnl)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
