import { NextRequest, NextResponse } from "next/server";
import { userFromToken } from "@/lib/demo-store";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function getToken(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return req.cookies.get("tf_token")?.value || null;
}

export function requireUser(req: NextRequest) {
  const user = userFromToken(getToken(req));
  if (!user) return { user: null, res: error("Unauthorized", 401) };
  if (user.status === "suspended") return { user: null, res: error("Account suspended", 403) };
  return { user, res: null as NextResponse | null };
}

export function requireAdmin(req: NextRequest) {
  const r = requireUser(req);
  if (r.res) return r;
  if (r.user!.role !== "admin") return { user: null, res: error("Admin only", 403) };
  return r;
}
