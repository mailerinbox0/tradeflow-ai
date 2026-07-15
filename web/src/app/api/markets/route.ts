import { json } from "@/lib/api";

type Market = {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume: number;
  coinId?: string;
};

const SEED: Market[] = [
  { symbol: "BTC", name: "Bitcoin", price: 68420.55, change24h: 2.14, volume: 2.8e10, coinId: "bitcoin" },
  { symbol: "ETH", name: "Ethereum", price: 3521.8, change24h: -0.86, volume: 1.2e10, coinId: "ethereum" },
  { symbol: "SOL", name: "Solana", price: 178.42, change24h: 4.52, volume: 3.2e9, coinId: "solana" },
  { symbol: "BNB", name: "BNB", price: 612.3, change24h: 1.12, volume: 1.5e9, coinId: "binancecoin" },
  { symbol: "XRP", name: "XRP", price: 0.6124, change24h: 1.05, volume: 1.8e9, coinId: "ripple" },
  { symbol: "DOGE", name: "Dogecoin", price: 0.142, change24h: -2.1, volume: 9e8, coinId: "dogecoin" },
  { symbol: "ADA", name: "Cardano", price: 0.58, change24h: 0.72, volume: 7e8, coinId: "cardano" },
  { symbol: "AVAX", name: "Avalanche", price: 36.91, change24h: -1.72, volume: 5.4e8, coinId: "avalanche-2" },
];

function fallbackMarkets(): Market[] {
  return SEED.map((m) => {
    const jitter = 1 + (Math.random() - 0.5) * 0.002;
    return {
      ...m,
      price: Number((m.price * jitter).toFixed(m.price > 10 ? 2 : 4)),
      change24h: Number((m.change24h + (Math.random() - 0.5) * 0.1).toFixed(2)),
    };
  });
}

async function fetchCoinGecko(): Promise<Market[] | null> {
  try {
    const ids = SEED.map((m) => m.coinId).filter(Boolean).join(",");
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<
      string,
      { usd?: number; usd_24h_change?: number; usd_24h_vol?: number }
    >;
    return SEED.map((m) => {
      const row = m.coinId ? data[m.coinId] : undefined;
      if (!row?.usd) return m;
      return {
        ...m,
        price: Number(row.usd.toFixed(row.usd > 10 ? 2 : 6)),
        change24h: Number((row.usd_24h_change ?? m.change24h).toFixed(2)),
        volume: row.usd_24h_vol ?? m.volume,
      };
    });
  } catch {
    return null;
  }
}

export async function GET() {
  // Never block the dashboard if the external price API is slow/down
  const live = await Promise.race([
    fetchCoinGecko(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 2800)),
  ]);
  const markets = live || fallbackMarkets();
  const sorted = [...markets].sort((a, b) => b.change24h - a.change24h);
  return json({
    markets,
    gainers: sorted.filter((m) => m.change24h > 0).slice(0, 5),
    losers: sorted.filter((m) => m.change24h < 0).slice(0, 5),
    source: live ? "coingecko" : "demo-fallback",
    updatedAt: new Date().toISOString(),
  });
}
