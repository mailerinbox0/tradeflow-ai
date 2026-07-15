/** Approximate spot bases for demo live trade mark simulation. */
export const TRADE_PAIR_BASE_PRICE: Record<string, number> = {
  "XAU/USD": 4050,
  "BTC/USD": 95000,
  "ETH/USDT": 3500,
  "BNB/USDT": 620,
  "SOL/USDT": 180,
  "XRP/USDT": 2.4,
  "ADA/USDT": 0.75,
  "DOGE/USDT": 0.18,
  "AVAX/USDT": 35,
  "EUR/USD": 1.08,
  "GBP/USD": 1.27,
};

export function basePriceForPair(pair: string) {
  return TRADE_PAIR_BASE_PRICE[pair] || 100;
}

function seedFromId(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type LiveTradePathPoint = {
  t: number; // 0..1 progress
  price: number;
  pnl: number;
};

export type LiveTradeSnapshot = {
  entryPrice: number;
  markPrice: number;
  side: "buy" | "sell";
  unrealizedPnl: number;
  progress: number;
  elapsedSec: number;
  remainingSec: number;
  sessionHigh: number;
  sessionLow: number;
  path: LiveTradePathPoint[];
};

/**
 * Deterministic live path for an active AI session — recreates how price / P&L move
 * from entry until settlement (client-side visualization).
 */
export function computeLiveTradeSnapshot(
  trade: {
    id: string;
    pair: string;
    amountUsd: number;
    durationSeconds: number;
    startedAt?: string;
    endsAt: string;
    entryPrice?: number;
    side?: "buy" | "sell";
  },
  nowMs = Date.now(),
): LiveTradeSnapshot {
  const start = trade.startedAt ? new Date(trade.startedAt).getTime() : nowMs;
  const end = new Date(trade.endsAt).getTime();
  const total = Math.max(1000, end - start);
  const elapsed = Math.max(0, Math.min(total, nowMs - start));
  const progress = elapsed / total;
  const entryPrice = trade.entryPrice || basePriceForPair(trade.pair);
  const side = trade.side || "buy";
  const rnd = mulberry32(seedFromId(trade.id));
  const maxLoss = trade.amountUsd * 0.1;
  const targetWin = trade.amountUsd * (0.05 + rnd() * 0.1);
  // Bias end outcome from seed so the path feels purposeful
  const endBias = rnd() > 0.42 ? 1 : -1;

  const steps = 48;
  const path: LiveTradePathPoint[] = [];
  let price = entryPrice;
  let high = entryPrice;
  let low = entryPrice;
  let lastPnl = 0;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (t > progress + 0.001) break;
    const wave = Math.sin(t * Math.PI * (2 + rnd() * 3) + rnd() * 6) * (0.0012 + rnd() * 0.0015);
    const drift = endBias * t * t * (0.002 + rnd() * 0.003);
    const noise = (rnd() - 0.5) * 0.0008;
    const move = wave + drift + noise;
    price = entryPrice * (1 + move);
    const pct = (price - entryPrice) / entryPrice;
    const signed = side === "buy" ? pct : -pct;
    let pnl = trade.amountUsd * signed * 8; // leverage-ish visual sensitivity
    if (pnl > targetWin * 1.4) pnl = targetWin * 1.4;
    if (pnl < -maxLoss) pnl = -maxLoss;
    lastPnl = Number(pnl.toFixed(2));
    if (price > high) high = price;
    if (price < low) low = price;
    path.push({ t, price: Number(price.toFixed(price >= 100 ? 2 : 5)), pnl: lastPnl });
  }

  if (path.length === 0) {
    path.push({ t: 0, price: entryPrice, pnl: 0 });
  }

  const mark = path[path.length - 1];
  return {
    entryPrice,
    markPrice: mark.price,
    side,
    unrealizedPnl: mark.pnl,
    progress,
    elapsedSec: Math.floor(elapsed / 1000),
    remainingSec: Math.max(0, Math.ceil((end - nowMs) / 1000)),
    sessionHigh: Number(high.toFixed(high >= 100 ? 2 : 5)),
    sessionLow: Number(low.toFixed(low >= 100 ? 2 : 5)),
    path,
  };
}
