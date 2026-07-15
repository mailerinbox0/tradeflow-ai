import { Link } from "react-router-dom";
import "./LandingPage.css";

const DEMO_TICKERS = [
  { symbol: "BTC", change: "+2.14%" },
  { symbol: "ETH", change: "-0.86%" },
  { symbol: "SOL", change: "+4.52%" },
  { symbol: "XRP", change: "+1.05%" },
  { symbol: "AVAX", change: "-1.72%" },
  { symbol: "LINK", change: "+0.94%" },
];

export function LandingPage() {
  const strip = [...DEMO_TICKERS, ...DEMO_TICKERS];

  return (
    <div className="landing">
      <header className="landing__nav">
        <span className="landing__mark" aria-hidden>
          TF
        </span>
        <nav className="landing__links">
          <Link to="/login">Sign in</Link>
          <Link className="landing__cta-inline" to="/login">
            Open terminal
          </Link>
        </nav>
      </header>

      <main className="landing__hero">
        <div className="landing__copy">
          <p className="landing__brand">TradeFlow AI</p>
          <h1>Trade crypto with signal, not noise.</h1>
          <p className="landing__lede">
            An AI-guided trading desk for live markets, position clarity, and faster execution.
          </p>
          <div className="landing__actions">
            <Link className="btn btn--primary" to="/login">
              Launch platform
            </Link>
            <a className="btn btn--ghost" href="#markets">
              See markets
            </a>
          </div>
        </div>

        <div className="landing__visual" aria-hidden>
          <div className="landing__chart">
            <svg viewBox="0 0 640 420" preserveAspectRatio="none">
              <defs>
                <linearGradient id="flowFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2ee6a6" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#2ee6a6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                className="landing__flow-fill"
                d="M0 290 C80 250 120 310 190 250 C260 190 300 210 360 160 C430 100 490 140 560 90 L640 70 L640 420 L0 420 Z"
                fill="url(#flowFill)"
              />
              <path
                className="landing__flow-line"
                d="M0 290 C80 250 120 310 190 250 C260 190 300 210 360 160 C430 100 490 140 560 90 L640 70"
                fill="none"
                stroke="#2ee6a6"
                strokeWidth="3"
              />
            </svg>
            <div className="landing__orb" />
          </div>
        </div>
      </main>

      <section id="markets" className="landing__ticker" aria-label="Market movers">
        <div className="landing__ticker-track">
          {strip.map((t, i) => (
            <span key={`${t.symbol}-${i}`} className={t.change.startsWith("+") ? "up" : "down"}>
              {t.symbol} {t.change}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
