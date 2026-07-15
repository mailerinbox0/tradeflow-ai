import { error, json, requireUser } from "@/lib/api";
import { DEPOSIT_ASSETS } from "@/lib/constants";
import {
  flushDueEmails,
  getStore,
  settleUserTrades,
  uid,
  userHasCompletedTradeSession,
} from "@/lib/demo-store";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { user, res } = requireUser(req);
  if (res) return res;
  flushDueEmails();
  settleUserTrades(user!.id);
  const canWithdraw = userHasCompletedTradeSession(user!.id);
  const fresh = getStore().users.find((u) => u.id === user!.id)!;
  return json({
    withdrawals: getStore().withdrawals.filter((w) => w.userId === fresh.id),
    balanceUsd: fresh.balanceUsd,
    canWithdraw,
    withdrawBlockedReason: canWithdraw
      ? null
      : "You must complete at least one AI bot trading session before you can make a withdrawal.",
  });
}

export async function POST(req: NextRequest) {
  const { user, res } = requireUser(req);
  if (res) return res;
  settleUserTrades(user!.id);
  if (!userHasCompletedTradeSession(user!.id)) {
    return error("You must complete at least one AI bot trading session before you can make a withdrawal.");
  }
  const body = await req.json().catch(() => ({}));
  const amountUsd = Number(body.amountUsd);
  const asset = String(body.asset || "");
  const network = String(body.network || "");
  const address = String(body.address || "").trim();
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return error("Invalid amount");
  if (!address || address.length < 10) return error("Invalid withdrawal address");
  const conf = DEPOSIT_ASSETS.find((a) => a.symbol === asset);
  if (!conf || !conf.networks.includes(network as never)) return error("Invalid asset/network");
  if (amountUsd > user!.balanceUsd) return error("Insufficient balance");

  user!.balanceUsd = Number((user!.balanceUsd - amountUsd).toFixed(2));
  const withdrawal = {
    id: uid("wd"),
    userId: user!.id,
    amountUsd,
    asset,
    network,
    address,
    status: "pending" as const,
    createdAt: new Date().toISOString(),
  };
  getStore().withdrawals.unshift(withdrawal);
  getStore().activities.unshift({
    id: uid("act"),
    kind: "withdrawal",
    message: `${user!.fullName.split(" ")[0]} requested $${amountUsd} ${asset} withdrawal`,
    amountUsd,
    createdAt: new Date().toISOString(),
  });
  return json({ withdrawal, balanceUsd: user!.balanceUsd, emailQueued: true });
}
