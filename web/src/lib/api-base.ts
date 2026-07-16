/** Base URL for API calls. Empty = same origin (Fly / local). Set on Firebase static host. */
export function apiBase(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host.includes("tradeflow-ai-b9020") || host.endsWith(".web.app") && host.includes("tradeflow")) {
      return "https://tradeflow-ai.fly.dev";
    }
  }
  return "";
}

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = apiBase();
  return base ? `${base}${p}` : p;
}
