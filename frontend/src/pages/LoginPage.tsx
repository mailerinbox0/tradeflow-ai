import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import "./AuthPages.css";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("trader@tradeflow.ai");
  const [password, setPassword] = useState("tradeflow123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const session = await api.login(email.trim(), password);
      localStorage.setItem("tf_token", session.access_token);
      localStorage.setItem("tf_email", session.email);
      navigate("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      <Link className="auth__brand" to="/">
        TradeFlow AI
      </Link>
      <form className="auth__form" onSubmit={onSubmit}>
        <h1>Sign in</h1>
        <p>Access your trading terminal.</p>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>
        {error ? <p className="auth__error">{error}</p> : null}
        <button className="btn btn--primary" type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Continue"}
        </button>
        <p className="auth__hint">Demo: trader@tradeflow.ai / tradeflow123</p>
      </form>
    </div>
  );
}
