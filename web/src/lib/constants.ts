/** Max loss on any single trade stake (business rule). */
export const MAX_LOSS_PCT = 10;

/** Randomized social publish windows (minutes). Only real activity. */
export const SOCIAL_INTERVAL_MINUTES = [10, 15, 20, 25] as const;

export const TRADE_DURATIONS = [
  { label: "1 Minute", seconds: 60 },
  { label: "5 Minutes", seconds: 300 },
  { label: "15 Minutes", seconds: 900 },
  { label: "30 Minutes", seconds: 1800 },
  { label: "1 Hour", seconds: 3600 },
  { label: "24 Hours", seconds: 86400 },
] as const;

export const TRADE_PAIRS = [
  "XAU/USD",
  "BTC/USD",
  "ETH/USDT",
  "BNB/USDT",
  "SOL/USDT",
  "XRP/USDT",
  "ADA/USDT",
  "DOGE/USDT",
  "AVAX/USDT",
  "EUR/USD",
  "GBP/USD",
] as const;

export const TRADE_PAIR_LABELS: Record<string, string> = {
  "XAU/USD": "XAU/USD (Gold)",
  "BTC/USD": "BTC/USD (Bitcoin)",
  "ETH/USDT": "ETH/USDT (Ethereum)",
  "BNB/USDT": "BNB/USDT (BNB)",
  "SOL/USDT": "SOL/USDT (Solana)",
  "XRP/USDT": "XRP/USDT (XRP)",
  "ADA/USDT": "ADA/USDT (Cardano)",
  "DOGE/USDT": "DOGE/USDT (Dogecoin)",
  "AVAX/USDT": "AVAX/USDT (Avalanche)",
  "EUR/USD": "EUR/USD (Euro)",
  "GBP/USD": "GBP/USD (Pound)",
};

/** Max sessions the AI bot can run in one Start cycle before needing Stop/reset. */
export const BOT_CYCLE_SESSION_CAP = 45;

export const DEPOSIT_ASSETS = [
  { symbol: "USDT", networks: ["TRC20", "ERC20", "BEP20", "Arbitrum"] },
  { symbol: "ETH", networks: ["ERC20", "Arbitrum"] },
  { symbol: "BTC", networks: ["Bitcoin"] },
  { symbol: "SOL", networks: ["Solana"] },
  { symbol: "USDC", networks: ["ERC20", "Solana", "Arbitrum"] },
  { symbol: "BNB", networks: ["BEP20"] },
] as const;

export const DEPOSIT_PRESETS = [100, 500, 1000, 5000] as const;

export const CRYPTO_ONRAMPS = [
  {
    id: "binance",
    name: "Binance",
    tag: "EASIEST",
    methods: ["P2P", "Card"],
    url: "https://www.binance.com",
  },
  {
    id: "bybit",
    name: "Bybit",
    tag: "FAST",
    methods: ["P2P", "Card"],
    url: "https://www.bybit.com",
  },
  {
    id: "coinbase",
    name: "Coinbase",
    tag: "SIMPLE",
    methods: ["Card", "Bank"],
    url: "https://www.coinbase.com",
  },
] as const;

export const COUNTRY_OPTIONS = [
  "United States",
  "United Kingdom",
  "Nigeria",
  "Belize",
  "Canada",
  "Germany",
  "India",
  "South Africa",
  "Ghana",
  "Kenya",
] as const;

export const BRAND = {
  name: "TradeFlow AI",
  tagline: "Professional Trading Platform",
  supportEmail: "support@tradeflow.ai",
  minInvestment: 100,
} as const;
