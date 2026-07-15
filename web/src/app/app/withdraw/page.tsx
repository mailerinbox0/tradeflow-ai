"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpFromLine,
  History,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { apiFetch, useAuth } from "@/lib/auth-store";
import { DEPOSIT_ASSETS } from "@/lib/constants";
import { formatUsd } from "@/lib/utils";

type Withdrawal = {
  id: string;
  amountUsd: number;
  asset: string;
  network: string;
  address: string;
  status: string;
  createdAt: string;
};

export default function WithdrawPage() {
  const router = useRouter();
  const { token, user, updateUser } = useAuth();
  const [asset, setAsset] = useState("");
  const [network, setNetwork] = useState("");
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [canWithdraw, setCanWithdraw] = useState(true);
  const [history, setHistory] = useState<Withdrawal[]>([]);
  const [balance, setBalance] = useState(user?.balanceUsd || 0);

  const networks = useMemo(
    () => [...(DEPOSIT_ASSETS.find((a) => a.symbol === asset)?.networks || [])],
    [asset],
  );

  const load = useCallback(async () => {
    if (!token) return;
    const data = await apiFetch<{
      withdrawals: Withdrawal[];
      balanceUsd: number;
      canWithdraw: boolean;
    }>("/api/withdrawals", { token });
    setHistory(data.withdrawals || []);
    setBalance(data.balanceUsd ?? user?.balanceUsd ?? 0);
    setCanWithdraw(data.canWithdraw);
    updateUser({ balanceUsd: data.balanceUsd });
  }, [token, updateUser, user?.balanceUsd]);

  useEffect(() => {
    if (!token) router.replace("/auth/login");
  }, [token, router]);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [load]);

  useEffect(() => {
    if (!asset) {
      setNetwork("");
      return;
    }
    setNetwork(networks[0] || "");
  }, [asset, networks]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    if (!canWithdraw) {
      setError("Complete an AI bot trading session before withdrawing.");
      return;
    }
    if (!asset || !network) {
      setError("Select a coin and network.");
      return;
    }
    setBusy(true);
    try {
      const data = await apiFetch<{ balanceUsd: number; withdrawal: Withdrawal }>("/api/withdrawals", {
        method: "POST",
        token,
        body: JSON.stringify({
          amountUsd: Number(amount),
          asset,
          network,
          address,
        }),
      });
      updateUser({ balanceUsd: data.balanceUsd });
      setBalance(data.balanceUsd);
      setOk("Withdrawal submitted — pending processing.");
      setAmount("");
      setAddress("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function statusClass(status: string) {
    const s = status.toLowerCase();
    if (s === "completed") return "bg-[rgba(34,197,94,0.15)] text-[var(--green)]";
    if (s === "rejected") return "bg-[rgba(239,68,68,0.15)] text-[var(--red)]";
    return "bg-[rgba(245,158,11,0.18)] text-[var(--amber)]";
  }

  return (
    <AppShell title="Withdraw Funds">
      <div className="mx-auto max-w-xl space-y-5">
        {/* Balance header */}
        <div className="tf-card overflow-hidden">
          <div className="flex items-start gap-3 p-5">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[rgba(0,163,255,0.15)] text-[var(--blue)]">
              <ArrowUpFromLine className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold">Withdraw Funds</h2>
              <p className="text-sm text-[var(--muted)]">Transfer to your crypto wallet.</p>
            </div>
          </div>
          <div className="flex items-end justify-between border-t border-[var(--line)] px-5 py-4">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.14em] text-[var(--muted)]">
                AVAILABLE BALANCE
              </p>
              <p className="mt-1 text-3xl font-bold">{formatUsd(balance)}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">USD value, ready to withdraw.</p>
            </div>
            <Wallet className="h-8 w-8 text-[var(--blue)] opacity-80" />
          </div>
        </div>

        {/* Trade gate */}
        {!canWithdraw ? (
          <div className="rounded-xl border border-[rgba(245,158,11,0.45)] bg-[rgba(245,158,11,0.1)] p-4">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--amber)]" />
              <div>
                <p className="text-sm text-[var(--amber)]">
                  You must complete at least one AI bot trading session before you can make a withdrawal.
                </p>
                <Link
                  href="/app/trade"
                  className="mt-2 inline-block text-sm font-semibold text-[var(--amber)] hover:underline"
                >
                  Go to AI Trading Bot →
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {/* Form */}
        <form className="tf-card space-y-4 p-5" onSubmit={submit}>
          <h3 className="font-semibold">New Withdrawal Request</h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="tf-label">Coin</label>
              <select
                className={`tf-input ${asset ? "border-[var(--green)] shadow-[0_0_12px_rgba(34,197,94,0.2)]" : ""}`}
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                required
                disabled={!canWithdraw}
              >
                <option value="">Select coin</option>
                {DEPOSIT_ASSETS.map((a) => (
                  <option key={a.symbol} value={a.symbol}>
                    {a.symbol}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="tf-label">Network</label>
              <select
                className="tf-input"
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                required
                disabled={!canWithdraw || !asset}
              >
                <option value="">{asset ? "Select network" : "Select coin first"}</option>
                {networks.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="tf-label">Amount (USD)</label>
            <input
              className="tf-input"
              type="number"
              min={1}
              step="0.01"
              placeholder="0.00"
              required
              disabled={!canWithdraw}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div>
            <label className="tf-label">Wallet Address</label>
            <input
              className="tf-input"
              required
              disabled={!canWithdraw}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter your wallet address"
            />
          </div>

          {error ? <p className="text-sm text-[var(--red)]">{error}</p> : null}
          {ok ? <p className="text-sm text-[var(--green)]">{ok}</p> : null}

          <button
            className="tf-btn tf-btn-primary tf-glow w-full !rounded-xl"
            type="submit"
            disabled={!canWithdraw || busy}
          >
            {busy ? "Submitting…" : "Withdraw"}
          </button>
        </form>

        {/* History */}
        <div className="tf-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.14em] text-[var(--muted)]">
              <History className="h-3.5 w-3.5" /> WITHDRAWAL HISTORY
            </p>
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-full border border-[var(--line)] text-[var(--muted)] hover:text-white"
              onClick={() => load().catch(() => undefined)}
              aria-label="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {history.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Wallet className="h-12 w-12 text-[var(--muted)] opacity-40" />
              <p className="mt-3 text-sm text-[var(--muted)]">No withdrawal requests yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-black/15 px-3 py-3"
                >
                  <div>
                    <p className="font-semibold">{formatUsd(w.amountUsd)}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {w.asset} · {w.network} ·{" "}
                      {new Date(w.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(w.status)}`}>
                    {w.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
