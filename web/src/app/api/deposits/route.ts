import { error, json, requireUser } from "@/lib/api";
import { BRAND, DEPOSIT_ASSETS } from "@/lib/constants";
import { getStore, resolveDepositAddress, settleUserTrades, uid } from "@/lib/demo-store";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { user, res } = requireUser(req);
  if (res) return res;
  settleUserTrades(user!.id);
  const deposits = getStore().deposits.filter((d) => d.userId === user!.id);
  return json({ deposits, assets: DEPOSIT_ASSETS, minDepositUsd: BRAND.minInvestment });
}

export async function POST(req: NextRequest) {
  const { user, res } = requireUser(req);
  if (res) return res;
  settleUserTrades(user!.id);
  const body = await req.json().catch(() => ({}));
  const amountUsd = Number(body.amountUsd);
  const asset = String(body.asset || "");
  const network = String(body.network || "");
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return error("Invalid amount");
  if (amountUsd < BRAND.minInvestment) {
    return error(`Minimum deposit is $${BRAND.minInvestment}`);
  }
  const conf = DEPOSIT_ASSETS.find((a) => a.symbol === asset);
  if (!conf || !conf.networks.includes(network as never)) return error("Invalid asset/network");

  const configured = getStore().wallets.find(
    (w) => w.enabled && w.asset === asset && w.network === network && w.address.trim(),
  );
  if (!configured) {
    return error(`No deposit wallet configured for ${asset} on ${network}. Contact support.`);
  }

  const deposit = {
    id: uid("dep"),
    userId: user!.id,
    amountUsd,
    asset,
    network,
    address: resolveDepositAddress(asset, network),
    reference: `TF-${Date.now().toString(36).toUpperCase()}`,
    status: "pending" as const,
    createdAt: new Date().toISOString(),
  };
  getStore().deposits.unshift(deposit);
  getStore().activities.unshift({
    id: uid("act"),
    kind: "deposit",
    message: `${user!.fullName.split(" ")[0]} started a $${amountUsd} ${asset} deposit`,
    amountUsd,
    createdAt: new Date().toISOString(),
  });
  return json({
    deposit,
    emailQueued: true,
    emailPreview: {
      to: user!.email,
      subject: `Deposit instructions ${deposit.reference}`,
      body: `Send ${asset} on ${network} to ${deposit.address}. Reference: ${deposit.reference}`,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const { user, res } = requireUser(req);
  if (res) return res;
  const body = await req.json().catch(() => ({}));
  const deposit = getStore().deposits.find((d) => d.id === body.id && d.userId === user!.id);
  if (!deposit) return error("Deposit not found", 404);
  if (body.action === "mark-confirming") deposit.status = "confirming";
  if (body.action === "confirm-demo") {
    if (deposit.status === "confirmed") return json({ deposit });
    deposit.status = "confirmed";
    user!.balanceUsd = Number((user!.balanceUsd + deposit.amountUsd).toFixed(2));
    user!.totalDeposits = Number((user!.totalDeposits + deposit.amountUsd).toFixed(2));
    getStore().activities.unshift({
      id: uid("act"),
      kind: "funding",
      message: `${user!.fullName.split(" ")[0]} deposit confirmed $${deposit.amountUsd}`,
      amountUsd: deposit.amountUsd,
      createdAt: new Date().toISOString(),
    });
  }
  return json({ deposit, balanceUsd: user!.balanceUsd });
}
