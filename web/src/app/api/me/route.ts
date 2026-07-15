import { error, json, requireUser } from "@/lib/api";
import { getStore, settleUserTrades } from "@/lib/demo-store";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { user, res } = requireUser(req);
  if (res) return res;
  settleUserTrades(user!.id);
  const store = getStore();
  const fresh = store.users.find((u) => u.id === user!.id)!;
  const trades = store.trades.filter((t) => t.userId === fresh.id);
  const deposits = store.deposits.filter((d) => d.userId === fresh.id);
  const withdrawals = store.withdrawals.filter((w) => w.userId === fresh.id);
  return json({
    user: {
      id: fresh.id,
      email: fresh.email,
      fullName: fresh.fullName,
      phone: fresh.phone || "",
      role: fresh.role,
      balanceUsd: fresh.balanceUsd,
      country: fresh.country,
      totalProfit: fresh.totalProfit,
      totalDeposits: fresh.totalDeposits,
      totalWithdrawals: fresh.totalWithdrawals,
      status: fresh.status,
      referralCode: fresh.referralCode,
    },
    stats: {
      activeTrades: trades.filter((t) => t.status === "active").length,
      completedTrades: trades.filter((t) => t.status === "won" || t.status === "lost").length,
      wins: trades.filter((t) => t.status === "won").length,
      losses: trades.filter((t) => t.status === "lost").length,
    },
    trades,
    deposits,
    withdrawals,
  });
}

export async function PATCH(req: NextRequest) {
  const { user, res } = requireUser(req);
  if (res) return res;
  const body = await req.json().catch(() => ({}));
  const store = getStore();

  // Password change — require current password
  if (body.newPassword || body.password) {
    const current = String(body.currentPassword || "");
    const next = String(body.newPassword || body.password || "");
    if (!current) return error("Current password is required");
    if (current !== user!.password) return error("Current password is incorrect");
    if (next.length < 8) return error("New password must be at least 8 characters");
    if (body.confirmPassword != null && String(body.confirmPassword) !== next) {
      return error("New password confirmation does not match");
    }
    user!.password = next;
    user!.forcePasswordChange = false;
  }

  // Email change
  if (typeof body.email === "string" && body.email.trim()) {
    const email = body.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error("Enter a valid email address");
    const taken = store.users.some((u) => u.id !== user!.id && u.email.toLowerCase() === email);
    if (taken) return error("That email is already in use");
    user!.email = email;
  }

  const first = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const last = typeof body.lastName === "string" ? body.lastName.trim() : "";
  if (first || last || body.fullName) {
    const parts = String(user!.fullName || "").trim().split(/\s+/);
    const f = first || parts[0] || "";
    const l = last || parts.slice(1).join(" ") || "";
    user!.fullName = body.fullName ? String(body.fullName).trim() : `${f} ${l}`.trim();
  }
  if (typeof body.phone === "string") user!.phone = body.phone.trim();
  if (typeof body.country === "string" && body.country.trim()) user!.country = body.country.trim();

  return json({
    ok: true,
    message: "Profile updated",
    user: {
      id: user!.id,
      email: user!.email,
      fullName: user!.fullName,
      phone: user!.phone || "",
      country: user!.country,
      role: user!.role,
      balanceUsd: user!.balanceUsd,
    },
  });
}
