import { error, json } from "@/lib/api";
import { createSession, getStore, issueOtp, uid, verifyOtp } from "@/lib/demo-store";
import { countries } from "countries-list";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");

  if (action === "request-signup-otp") {
    const email = String(body.email || "").trim().toLowerCase();
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const fullName = String(body.fullName || "").trim() || [firstName, lastName].filter(Boolean).join(" ");
    const country = String(body.country || "").trim();
    const password = String(body.password || "");
    const phone = String(body.phone || "").trim();
    const phoneCode = String(body.phoneCode || "").trim();
    if (!email || !fullName || !country || password.length < 8) {
      return error("Name, country, email and 8+ char password required");
    }
    if (!Object.values(countries).some((c) => c.name === country)) {
      return error("Select a valid country");
    }
    const exists = getStore().users.some((u) => u.email === email);
    if (exists) return error("Email already registered", 409);
    const code = issueOtp(email);
    (getStore() as unknown as { pending?: Record<string, unknown> }).pending ??= {};
    (getStore() as unknown as { pending: Record<string, unknown> }).pending[email] = {
      fullName,
      country,
      password,
      phone: phoneCode && phone ? `${phoneCode} ${phone}` : phone,
      email,
    };
    return json({ ok: true, demoCode: code, message: "Verification code sent" });
  }

  if (action === "verify-signup") {
    const email = String(body.email || "").trim().toLowerCase();
    const code = String(body.code || "");
    if (!verifyOtp(email, code)) return error("Invalid or expired code", 401);
    const pending = (getStore() as unknown as { pending?: Record<string, {
      fullName: string; country: string; password: string; phone?: string; email: string;
    }> }).pending?.[email];
    if (!pending) return error("Signup session expired");
    const user = {
      id: uid("user"),
      fullName: pending.fullName,
      email,
      country: pending.country,
      phone: pending.phone,
      role: "user" as const,
      password: pending.password,
      balanceUsd: 0,
      totalProfit: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      status: "active" as const,
      referralCode: `TF${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      createdAt: new Date().toISOString(),
    };
    getStore().users.push(user);
    const token = createSession(user.id);
    return json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        balanceUsd: user.balanceUsd,
        country: user.country,
      },
    });
  }

  if (action === "request-login-otp") {
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const expectedRole = String(body.expectedRole || "").trim(); // "admin" | "user" | ""
    const user = getStore().users.find((u) => u.email === email);
    if (!user || user.password !== password) return error("Invalid email or password", 401);
    if (user.status === "suspended") return error("Account suspended", 403);
    if (expectedRole === "admin" && user.role !== "admin") {
      return error("Admin credentials required", 403);
    }
    if (expectedRole === "user" && user.role === "admin") {
      return error("Staff accounts must use the admin console login", 403);
    }
    const code = issueOtp(email);
    return json({ ok: true, demoCode: code, message: "Verification code sent" });
  }

  if (action === "verify-login") {
    const email = String(body.email || "").trim().toLowerCase();
    const code = String(body.code || "");
    const expectedRole = String(body.expectedRole || "").trim();
    if (!verifyOtp(email, code)) return error("Invalid or expired code", 401);
    const user = getStore().users.find((u) => u.email === email);
    if (!user) return error("User not found", 404);
    if (expectedRole === "admin" && user.role !== "admin") {
      return error("Admin access only", 403);
    }
    if (expectedRole === "user" && user.role === "admin") {
      return error("Staff accounts must use the admin console login", 403);
    }
    const token = createSession(user.id);
    return json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        balanceUsd: user.balanceUsd,
        country: user.country,
      },
    });
  }

  return error("Unknown action");
}
