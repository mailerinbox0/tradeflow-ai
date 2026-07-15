import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type MarketTicker, type MeResponse } from "../lib/api";
import "./DashboardPage.css";

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: n < 2 ? 4 : 2 });
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [tickers, setTickers] = useState<MarketTicker[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("tf_token");
    if (!token) {
      navigate("/login");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const [profile, markets] = await Promise.all([api.me(), api.tickers()]);
        if (!cancelled) {
          setMe(profile);
          setTickers(markets);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
          localStorage.removeItem("tf_token");
          navigate("/login");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  function logout() {
    localStorage.removeItem("tf_token");
    localStorage.removeItem("tf_email");
    navigate("/");
  }

  return (
    <div className="dash">
      <header className="dash__top">
        <Link className="dash__brand" to="/">
          TradeFlow AI
        </Link>
        <div className="dash__user">
          <span>{me?.display_name || "Trader"}</span>
          <button type="button" className="btn btn--ghost" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="dash__main">
        <div className="dash__intro">
          <h1>Markets</h1>
          <p>Live desk snapshot from TradeFlow AI API.</p>
        </div>
        {error ? <p className="dash__error">{error}</p> : null}
        <div className="dash__table" role="table" aria-label="Market tickers">
          <div className="dash__row dash__row--head" role="row">
            <span>Pair</span>
            <span>Price</span>
            <span>24h</span>
            <span>Volume</span>
          </div>
          {tickers.map((t) => (
            <div className="dash__row" role="row" key={t.symbol}>
              <span>
                <strong>{t.symbol}</strong>
                <em>{t.name}</em>
              </span>
              <span>{money(t.price)}</span>
              <span className={t.change_24h >= 0 ? "up" : "down"}>
                {t.change_24h >= 0 ? "+" : ""}
                {t.change_24h.toFixed(2)}%
              </span>
              <span>{money(t.volume_24h)}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
