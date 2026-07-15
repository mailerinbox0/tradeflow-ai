"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Activity, Star, X } from "lucide-react";

declare global {
  interface Window {
    TradingView?: {
      widget: new (opts: Record<string, unknown>) => { remove?: () => void };
    };
  }
}

export type ChartSymbol = {
  id: string;
  label: string;
  /** TradingView symbol e.g. BITSTAMP:BTCUSD */
  tv: string;
};

export const DASHBOARD_CHART_SYMBOLS: ChartSymbol[] = [
  { id: "BTC", label: "Bitcoin (BTC/USD)", tv: "BITSTAMP:BTCUSD" },
  { id: "ETH", label: "Ethereum (ETH/USD)", tv: "BITSTAMP:ETHUSD" },
  { id: "BNB", label: "BNB (BNB/USD)", tv: "BINANCE:BNBUSD" },
  { id: "SOL", label: "Solana (SOL/USD)", tv: "BINANCE:SOLUSD" },
  { id: "XRP", label: "XRP (XRP/USD)", tv: "BITSTAMP:XRPUSD" },
  { id: "ADA", label: "Cardano (ADA/USD)", tv: "BINANCE:ADAUSD" },
  { id: "DOGE", label: "Dogecoin (DOGE/USD)", tv: "BINANCE:DOGEUSD" },
  { id: "AVAX", label: "Avalanche (AVAX/USD)", tv: "BINANCE:AVAXUSD" },
  { id: "XAU", label: "Gold (XAU/USD)", tv: "OANDA:XAUUSD" },
  { id: "EUR", label: "Euro (EUR/USD)", tv: "FX:EURUSD" },
  { id: "GBP", label: "Pound (GBP/USD)", tv: "FX:GBPUSD" },
];

/** Map app trade pairs → TradingView chart symbol ids. */
export function chartSymbolIdForTradePair(pair: string): string {
  const map: Record<string, string> = {
    "XAU/USD": "XAU",
    "BTC/USD": "BTC",
    "ETH/USDT": "ETH",
    "BNB/USDT": "BNB",
    "SOL/USDT": "SOL",
    "XRP/USDT": "XRP",
    "ADA/USDT": "ADA",
    "DOGE/USDT": "DOGE",
    "AVAX/USDT": "AVAX",
    "EUR/USD": "EUR",
    "GBP/USD": "GBP",
  };
  return map[pair] || "BTC";
}

/** TradingView Advanced Chart `style` values (official widget API) */
const CHART_TYPES: { id: string; label: string }[] = [
  { id: "0", label: "Bars" },
  { id: "1", label: "Candles" },
  { id: "9", label: "Hollow candles" },
  { id: "8", label: "Heikin Ashi" },
  { id: "2", label: "Line" },
  { id: "3", label: "Area" },
  { id: "10", label: "Baseline" },
  { id: "12", label: "High-low" },
  { id: "4", label: "Renko" },
  { id: "7", label: "Line break" },
  { id: "5", label: "Kagi" },
  { id: "6", label: "Point & figure" },
];

const DEFAULT_FAVORITES = ["8", "2", "1"]; // Heikin Ashi, Line, Candles
const FAV_KEY = "tf-chart-type-favs";

const INTERVALS = [
  { key: "1", label: "1m" },
  { key: "30", label: "30m" },
  { key: "60", label: "1h" },
  { key: "240", label: "4h" },
  { key: "D", label: "1D" },
] as const;

let tvScriptPromise: Promise<void> | null = null;

function loadTradingViewScript() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.TradingView) return Promise.resolve();
  if (tvScriptPromise) return tvScriptPromise;
  tvScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-tv="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("TradingView script failed")));
      if (window.TradingView) resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://s3.tradingview.com/tv.js";
    s.async = true;
    s.dataset.tv = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("TradingView script failed"));
    document.head.appendChild(s);
  });
  return tvScriptPromise;
}

function ChartTypeIcon({ type, active }: { type: string; active?: boolean }) {
  const cls = active ? "text-slate-900" : "text-white";
  // Simple SVG glyphs approximating TradingView icons
  switch (type) {
    case "0":
      return (
        <svg viewBox="0 0 24 24" className={`h-7 w-7 ${cls}`}>
          <path fill="currentColor" d="M5 4h2v16H5V4zm6 4h2v12h-2V8zm6-2h2v14h-2V6z" />
        </svg>
      );
    case "1":
      return (
        <svg viewBox="0 0 24 24" className={`h-7 w-7 ${cls}`}>
          <path fill="currentColor" d="M7 3h2v4H7V3zm0 14h2v4H7v-4zm8-12h2v3h-2V5zm0 13h2v3h-2v-3z" />
          <rect x="5" y="7" width="6" height="10" rx="1" fill="currentColor" />
          <rect x="13" y="8" width="6" height="10" rx="1" fill="currentColor" />
        </svg>
      );
    case "9":
      return (
        <svg viewBox="0 0 24 24" className={`h-7 w-7 ${cls}`}>
          <path fill="none" stroke="currentColor" strokeWidth="2" d="M8 7h4v10H8zM14 8h4v9h-4z" />
          <path stroke="currentColor" strokeWidth="2" d="M10 4v3M10 17v3M16 5v3M16 17v2" />
        </svg>
      );
    case "8":
      return (
        <svg viewBox="0 0 24 24" className={`h-7 w-7 ${cls}`}>
          <rect x="5" y="6" width="6" height="9" rx="1" fill="currentColor" opacity="0.85" />
          <rect x="13" y="8" width="6" height="8" rx="1" fill="currentColor" />
          <path stroke="currentColor" strokeWidth="2" d="M8 4v2M8 15v4M16 5v3M16 16v3" />
        </svg>
      );
    case "2":
      return (
        <svg viewBox="0 0 24 24" className={`h-7 w-7 ${cls}`}>
          <path fill="none" stroke="currentColor" strokeWidth="2.2" d="M3 16l5-6 4 3 6-8 3 2" />
        </svg>
      );
    case "3":
      return (
        <svg viewBox="0 0 24 24" className={`h-7 w-7 ${cls}`}>
          <path fill="currentColor" opacity="0.35" d="M3 18l5-7 4 3 6-9 3 2v11H3z" />
          <path fill="none" stroke="currentColor" strokeWidth="2" d="M3 16l5-6 4 3 6-8 3 2" />
        </svg>
      );
    case "10":
      return (
        <svg viewBox="0 0 24 24" className={`h-7 w-7 ${cls}`}>
          <path stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" d="M3 14h18" />
          <path fill="none" stroke="currentColor" strokeWidth="2" d="M3 17l5-5 4 2 5-6 4 3" />
        </svg>
      );
    case "12":
      return (
        <svg viewBox="0 0 24 24" className={`h-7 w-7 ${cls}`}>
          <path stroke="currentColor" strokeWidth="2.5" d="M7 5v14M12 8v10M17 4v13" />
          <path stroke="currentColor" strokeWidth="2" d="M5 9h4M10 12h4M15 8h4" />
        </svg>
      );
    case "13":
      return (
        <svg viewBox="0 0 24 24" className={`h-7 w-7 ${cls}`}>
          <rect x="4" y="10" width="3.5" height="10" fill="currentColor" />
          <rect x="10" y="5" width="3.5" height="15" fill="currentColor" />
          <rect x="16" y="8" width="3.5" height="12" fill="currentColor" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={`h-7 w-7 ${cls}`}>
          <path fill="none" stroke="currentColor" strokeWidth="2" d="M3 17l6-7 4 3 7-9" />
        </svg>
      );
  }
}

export function TradingViewLiveChart({
  initialSymbolId = "BTC",
  symbolId,
  onSymbolChange,
  height = 520,
  liveTrading = false,
  liveLabel,
}: {
  initialSymbolId?: string;
  symbolId?: string;
  onSymbolChange?: (id: string) => void;
  height?: number;
  /** Emphasize live AI session on the chart chrome */
  liveTrading?: boolean;
  liveLabel?: string;
}) {
  const reactId = useId().replace(/:/g, "");
  const containerId = `tv_chart_${reactId}`;
  const widgetRef = useRef<{ remove?: () => void } | null>(null);
  const [internalId, setInternalId] = useState(initialSymbolId);
  const [interval, setIntervalKey] = useState<string>(liveTrading ? "1" : "60");
  const [style, setStyle] = useState("1");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(DEFAULT_FAVORITES);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");

  const activeId = symbolId ?? internalId;
  const symbol = DASHBOARD_CHART_SYMBOLS.find((s) => s.id === activeId) || DASHBOARD_CHART_SYMBOLS[0];
  const activeType = useMemo(() => CHART_TYPES.find((t) => t.id === style) || CHART_TYPES[1], [style]);

  useEffect(() => {
    if (liveTrading) setIntervalKey("1");
  }, [liveTrading]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed) && parsed.length) setFavorites(parsed.slice(0, 6));
      }
    } catch {
      /* ignore */
    }
  }, []);

  function persistFavorites(next: string[]) {
    setFavorites(next);
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function toggleFavorite(id: string) {
    persistFavorites(
      favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id].slice(0, 6),
    );
  }

  function selectSymbol(id: string) {
    if (onSymbolChange) onSymbolChange(id);
    else setInternalId(id);
  }

  function pickType(id: string) {
    setStyle(id);
    setPickerOpen(false);
  }

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setErr("");

    (async () => {
      try {
        await loadTradingViewScript();
        if (cancelled || !window.TradingView) return;

        const el = document.getElementById(containerId);
        if (el) el.innerHTML = "";
        if (widgetRef.current?.remove) {
          try {
            widgetRef.current.remove();
          } catch {
            /* ignore */
          }
        }

        widgetRef.current = new window.TradingView!.widget({
          autosize: true,
          symbol: symbol.tv,
          interval,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Etc/UTC",
          theme: "dark",
          style: String(style),
          locale: "en",
          toolbar_bg: "#0a101c",
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          allow_symbol_change: true,
          details: true,
          hotlist: false,
          calendar: false,
          withdateranges: true,
          studies: ["Volume@tv-basicstudies"],
          container_id: containerId,
          backgroundColor: "#0a101c",
          gridColor: "rgba(42, 46, 57, 0.5)",
        });
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Chart failed to load");
      }
    })();

    return () => {
      cancelled = true;
      if (widgetRef.current?.remove) {
        try {
          widgetRef.current.remove();
        } catch {
          /* ignore */
        }
      }
      widgetRef.current = null;
    };
  }, [containerId, symbol.tv, interval, style]);

  const favTypes = CHART_TYPES.filter((t) => favorites.includes(t.id));

  return (
    <section className="tf-card relative overflow-hidden p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 font-semibold">
          <Activity className="h-4 w-4 text-[var(--blue)]" />{" "}
          {liveTrading ? "Live AI Trade" : "Live Market Data"}
        </h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
            liveTrading
              ? "border-[rgba(34,197,94,0.45)] bg-[rgba(34,197,94,0.12)] text-[var(--green)]"
              : "border-[rgba(0,163,255,0.35)] bg-[rgba(0,163,255,0.1)] text-[var(--blue)]"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 animate-pulse rounded-full ${
              liveTrading ? "bg-[var(--green)]" : "bg-[var(--blue)]"
            }`}
          />
          {liveTrading
            ? liveLabel || "AI trading · real-time chart"
            : "Live · TradingView"}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          className="tf-input !min-h-9 w-full max-w-xs !py-1.5 text-sm sm:w-auto"
          value={symbol.id}
          onChange={(e) => selectSymbol(e.target.value)}
          aria-label="Select market"
          disabled={liveTrading && Boolean(symbolId)}
        >
          {DASHBOARD_CHART_SYMBOLS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>

        <div className="flex flex-wrap gap-1.5">
          {INTERVALS.map((iv) => (
            <button
              key={iv.key}
              type="button"
              onClick={() => setIntervalKey(iv.key)}
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition ${
                interval === iv.key
                  ? "border-[var(--blue)] bg-[rgba(0,163,255,0.15)] text-[var(--blue)]"
                  : "border-[var(--line)] text-[var(--muted)] hover:text-white"
              }`}
            >
              {iv.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="ml-auto inline-flex items-center gap-2 rounded-lg border border-[var(--line)] bg-black/30 px-3 py-1.5 text-xs font-semibold hover:border-[var(--blue)] hover:text-[var(--blue)]"
        >
          <ChartTypeIcon type={style} />
          <span>{activeType.label}</span>
          <span className="text-[var(--muted)]">▾</span>
        </button>
      </div>

      <p className="mb-2 text-sm text-[var(--muted)]">
        {symbol.label} · real-time market feed · switch chart type anytime (or use the Candles icon inside the chart
        toolbar)
      </p>

      {err ? <p className="mb-2 text-sm text-[var(--red)]">{err}</p> : null}
      {!ready && !err ? <p className="mb-2 text-xs text-[var(--muted)]">Connecting to live market…</p> : null}

      <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[#0a101c]" style={{ height }}>
        <div id={containerId} className="h-full w-full" />
      </div>

      {/* Chart type picker */}
      {pickerOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-3 sm:items-center">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={() => setPickerOpen(false)} />
          <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--line)] bg-[#131722] p-4 shadow-2xl sm:p-5">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-lg font-bold">Chart type</h3>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-full bg-white/10"
                onClick={() => setPickerOpen(false)}
                aria-label="Close chart type"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-4 text-xs text-[var(--muted)]">
              Long-press style: tap the star to favorite a chart type. All views use the live TradingView market feed.
            </p>

            {favTypes.length ? (
              <div className="mb-5">
                <p className="mb-2 text-[10px] font-semibold tracking-[0.14em] text-[var(--muted)]">FAVORITES</p>
                <div className="grid grid-cols-3 gap-2">
                  {favTypes.map((t) => {
                    const active = style === t.id;
                    return (
                      <button
                        key={`fav-${t.id}`}
                        type="button"
                        onClick={() => pickType(t.id)}
                        className={`relative flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition ${
                          active
                            ? "border-white bg-white text-slate-900"
                            : "border-transparent bg-[#1e222d] text-white hover:bg-[#2a2e39]"
                        }`}
                      >
                        <Star className="absolute right-1.5 top-1.5 h-3 w-3 fill-amber-400 text-amber-400" />
                        <ChartTypeIcon type={t.id} active={active} />
                        <span className="text-center text-[11px] font-medium leading-tight">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-3 gap-2">
              {CHART_TYPES.map((t) => {
                const active = style === t.id;
                const isFav = favorites.includes(t.id);
                return (
                  <div key={t.id} className="relative">
                    <button
                      type="button"
                      onClick={() => pickType(t.id)}
                      className={`flex w-full flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition ${
                        active
                          ? "border-white bg-white text-slate-900"
                          : "border-transparent bg-[#1e222d] text-white hover:bg-[#2a2e39]"
                      }`}
                    >
                      <ChartTypeIcon type={t.id} active={active} />
                      <span className="text-center text-[11px] font-medium leading-tight">{t.label}</span>
                    </button>
                    <button
                      type="button"
                      title={isFav ? "Remove favorite" : "Add favorite"}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(t.id);
                      }}
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/30"
                    >
                      <Star
                        className={`h-3 w-3 ${isFav ? "fill-amber-400 text-amber-400" : "text-[var(--muted)]"}`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
