import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED = new Set([
  "https://tradeflow-ai-b9020.web.app",
  "https://tradeflow-ai-b9020.firebaseapp.com",
  "https://tradeflow-ai.fly.dev",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const allow = ALLOWED.has(origin) ? origin : ALLOWED.values().next().value;

  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": allow || "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const res = NextResponse.next();
  if (origin && ALLOWED.has(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
