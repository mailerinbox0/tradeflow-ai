import { error, json, requireUser } from "@/lib/api";
import { BOT_CYCLE_SESSION_CAP, MAX_LOSS_PCT, TRADE_DURATIONS, TRADE_PAIRS, TRADE_PAIR_LABELS } from "@/lib/constants";
import { getStore, settleTradeIfDue, settleUserTrades, uid } from "@/lib/demo-store";
import { basePriceForPair } from "@/lib/live-trade-path";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { user, res } = requireUser(req);
  if (res) return res;
  settleUserTrades(user!.id);
  const store = getStore();
  const fresh = store.users.find((u) => u.id === user!.id)!;
  const trades = store.trades.filter((t) => t.userId === fresh.id);
  const active = trades.filter((t) => t.status === "active");
  const lockedUsd = active.reduce((a, t) => a + t.amountUsd, 0);
  return json({
    balanceUsd: fresh.balanceUsd,
    availableUsd: fresh.balanceUsd,
    lockedInSessionsUsd: lockedUsd,
    activeSessions: active.length,
    trades,
    pairs: TRADE_PAIRS,
    pairLabels: TRADE_PAIR_LABELS,
    durations: TRADE_DURATIONS,
    maxLossPct: MAX_LOSS_PCT,
    cycleSessionCap: BOT_CYCLE_SESSION_CAP,
  });
}

export async function POST(req: NextRequest) {
  const { user, res } = requireUser(req);
  if (res) return res;
  settleUserTrades(user!.id);

  if (user!.balanceUsd <= 0) return error("Deposit funds before trading", 403);

  const body = await req.json().catch(() => ({}));
  const pair = String(body.pair || "");
  const amountUsd = Number(body.amountUsd);
  const durationSeconds = Number(body.durationSeconds);
  if (!TRADE_PAIRS.includes(pair as never)) return error("Invalid pair");
  if (!TRADE_DURATIONS.some((d) => d.seconds === durationSeconds)) return error("Invalid duration");
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return error("Invalid amount");
  if (amountUsd > user!.balanceUsd) {
    return error(`Insufficient available balance (${user!.balanceUsd.toFixed(2)} USD free)`);
  }

  // Stake is reserved from available balance; other sessions keep running in the background
  user!.balanceUsd = Number((user!.balanceUsd - amountUsd).toFixed(2));
  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + durationSeconds * 1000);
  const entryBase = basePriceForPair(pair);
  const entryJitter = 1 + (Math.random() - 0.5) * 0.002;
  const side = Math.random() > 0.45 ? "buy" : "sell";
  const trade = {
    id: uid("tr"),
    userId: user!.id,
    pair,
    amountUsd,
    durationSeconds,
    status: "active" as const,
    resultPnl: 0,
    startedAt: startedAt.toISOString(),
    endsAt: endsAt.toISOString(),
    entryPrice: Number((entryBase * entryJitter).toFixed(entryBase >= 100 ? 2 : 5)),
    side: side as "buy" | "sell",
  };
  getStore().trades.unshift(trade);
  const activeCount = getStore().trades.filter((t) => t.userId === user!.id && t.status === "active").length;
  return json({
    trade,
    balanceUsd: user!.balanceUsd,
    availableUsd: user!.balanceUsd,
    activeSessions: activeCount,
    maxLossPct: MAX_LOSS_PCT,
    message: "Session started — continues even if you leave this page",
  });
}

export async function PATCH(req: NextRequest) {
  const { user, res } = requireUser(req);
  if (res) return res;
  settleUserTrades(user!.id);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const store = getStore();
  const trade = store.trades.find((t) => t.id === body.id && t.userId === user!.id);

  if (action === "stop") {
    const targets = body.id
      ? store.trades.filter((t) => t.id === body.id && t.userId === user!.id && t.status === "active")
      : store.trades.filter((t) => t.userId === user!.id && t.status === "active");
    if (targets.length === 0) {
      return json({ ok: true, balanceUsd: user!.balanceUsd, message: "No active session" });
    }
    for (const active of targets) {
      active.status = "cancelled";
      active.resultPnl = 0;
      user!.balanceUsd = Number((user!.balanceUsd + active.amountUsd).toFixed(2));
    }
    return json({
      ok: true,
      stopped: targets.length,
      balanceUsd: user!.balanceUsd,
      message:
        targets.length === 1
          ? "Session stopped — stake returned"
          : `${targets.length} sessions stopped — stakes returned`,
    });
  }

  if (action === "force-settle" && trade) {
    trade.endsAt = new Date(Date.now() - 1000).toISOString();
    settleTradeIfDue(trade, user!);
    return json({ ok: true, trade, balanceUsd: user!.balanceUsd });
  }

  return error("Unknown action");
}
