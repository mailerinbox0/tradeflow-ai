const API_BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8100").replace(/\/$/, "");

export type MarketTicker = {
  symbol: string;
  name: string;
  price: number;
  change_24h: number;
  volume_24h: number;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  email: string;
};

export type MeResponse = {
  email: string;
  display_name: string;
  role: string;
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = localStorage.getItem("tf_token");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let detail = "Request failed";
    try {
      const data = await res.json();
      detail = data.detail || data.error || detail;
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === "string" ? detail : "Request failed");
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ ok: boolean; service: string; version: string }>("/health"),
  login: (email: string, password: string) =>
    request<TokenResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<MeResponse>("/api/v1/auth/me"),
  tickers: () => request<MarketTicker[]>("/api/v1/markets/tickers"),
};
