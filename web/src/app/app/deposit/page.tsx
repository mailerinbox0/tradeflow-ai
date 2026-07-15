"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowDownToLine,
  Check,
  Copy,
  FolderOpen,
  RefreshCw,
  Share2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { apiFetch, useAuth } from "@/lib/auth-store";
import {
  BRAND,
  DEPOSIT_ASSETS,
  DEPOSIT_PRESETS,
} from "@/lib/constants";
import { formatUsd } from "@/lib/utils";

type Deposit = {
  id: string;
  amountUsd: number;
  asset: string;
  network: string;
  address: string;
  reference: string;
  status: string;
  createdAt?: string;
};

const COIN_META: Record<string, { bg: string; label: string }> = {
  USDT: { bg: "#26a17b", label: "₮" },
  ETH: { bg: "#627eea", label: "Ξ" },
  BTC: { bg: "#f7931a", label: "₿" },
  SOL: { bg: "#9945ff", label: "◎" },
  USDC: { bg: "#2775ca", label: "$" },
  BNB: { bg: "#f3ba2f", label: "B" },
};

const STEPS = [
  { n: 1, label: "Amount" },
  { n: 2, label: "Select Crypto" },
  { n: 3, label: "Payment" },
] as const;

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "confirmed") {
    return "bg-[rgba(34,197,94,0.15)] text-[var(--green)]";
  }
  if (s === "confirming") {
    return "bg-[rgba(0,163,255,0.15)] text-[var(--blue)]";
  }
  return "bg-[rgba(245,158,11,0.18)] text-[var(--amber)]";
}

function assetUnits(amountUsd: number, asset: string) {
  // Demo conversion rates — replace with live quotes in production
  const rates: Record<string, number> = {
    USDT: 1,
    USDC: 1,
    BTC: 66000,
    ETH: 3500,
    SOL: 160,
    BNB: 570,
  };
  const rate = rates[asset] || 1;
  const qty = amountUsd / rate;
  return qty.toFixed(asset === "BTC" ? 8 : asset === "ETH" || asset === "SOL" ? 6 : 8);
}

export default function DepositPage() {
  const router = useRouter();
  const { token, updateUser } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState("");
  const [asset, setAsset] = useState("USDT");
  const [network, setNetwork] = useState("TRC20");
  const [deposit, setDeposit] = useState<Deposit | null>(null);
  const [history, setHistory] = useState<Deposit[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expiresIn, setExpiresIn] = useState(59 * 60 + 47);

  const minDeposit = BRAND.minInvestment; // $100
  const networks = useMemo(
    () => [...(DEPOSIT_ASSETS.find((a) => a.symbol === asset)?.networks || [])],
    [asset],
  );
  const amountNum = amount === "" ? 0 : Number(amount);
  const amountValid = Number.isFinite(amountNum) && amountNum >= minDeposit;
  const amountTooLow = amount !== "" && Number.isFinite(amountNum) && amountNum > 0 && amountNum < minDeposit;

  const loadHistory = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch<{ deposits: Deposit[] }>("/api/deposits", { token });
      setHistory(data.deposits || []);
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    if (!token) router.replace("/auth/login");
  }, [token, router]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    setNetwork(networks[0] || "");
  }, [networks]);

  useEffect(() => {
    if (step !== 3 || !deposit) return;
    setExpiresIn(59 * 60 + 47);
    const t = setInterval(() => setExpiresIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [step, deposit?.id]);

  const expireLabel = useMemo(() => {
    const m = Math.floor(expiresIn / 60);
    const s = expiresIn % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [expiresIn]);

  async function createDeposit() {
    setError("");
    setBusy(true);
    try {
      const data = await apiFetch<{ deposit: Deposit }>("/api/deposits", {
        method: "POST",
        token,
        body: JSON.stringify({ amountUsd: amountNum, asset, network }),
      });
      setDeposit(data.deposit);
      setStep(3);
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function forceCheck() {
    if (!deposit) return;
    setBusy(true);
    try {
      await apiFetch<{ deposit: Deposit }>("/api/deposits", {
        method: "PATCH",
        token,
        body: JSON.stringify({ id: deposit.id, action: "mark-confirming" }),
      });
      // Demo: after force check, confirm on-chain so flow feels alive
      const data = await apiFetch<{ deposit: Deposit; balanceUsd: number }>("/api/deposits", {
        method: "PATCH",
        token,
        body: JSON.stringify({ id: deposit.id, action: "confirm-demo" }),
      });
      setDeposit(data.deposit);
      updateUser({ balanceUsd: data.balanceUsd });
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check failed");
    } finally {
      setBusy(false);
    }
  }

  async function copyAddress() {
    if (!deposit) return;
    try {
      await navigator.clipboard.writeText(deposit.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not copy address");
    }
  }

  async function shareAddress() {
    if (!deposit) return;
    const text = `Send ${deposit.asset} (${deposit.network}) to ${deposit.address}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Deposit address", text });
        return;
      } catch {
        /* fall through */
      }
    }
    await copyAddress();
  }

  function startNew() {
    setDeposit(null);
    setStep(1);
    setError("");
    setCopied(false);
  }

  return (
    <AppShell title="Deposit Funds">
      <div className="mx-auto max-w-xl space-y-5">
        {/* Intro */}
        <div className="tf-card flex flex-wrap items-center gap-3 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[rgba(0,163,255,0.15)] text-[var(--blue)]">
            <ArrowDownToLine className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Fund Your Account</p>
            <p className="text-sm text-[var(--muted)]">Secure crypto deposit — funds credited automatically</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.1)] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[var(--green)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
            ENCRYPTED • ON-CHAIN
          </span>
        </div>

        {/* Stepper */}
        <div className="tf-card px-4 py-4 sm:px-5">
          <div className="mb-6 flex items-center justify-between gap-2">
            {STEPS.map((s, i) => {
              const done = step > s.n;
              const active = step === s.n;
              return (
                <div key={s.n} className="flex flex-1 items-center gap-2">
                  <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:gap-2">
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${
                        done
                          ? "bg-[var(--green)] text-white"
                          : active
                            ? "bg-[var(--blue)] text-white"
                            : "bg-white/5 text-[var(--muted)]"
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" /> : s.n}
                    </span>
                    <span
                      className={`text-[11px] font-medium sm:text-xs ${
                        active ? "text-[var(--blue)]" : done ? "text-[var(--green)]" : "text-[var(--muted)]"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 ? (
                    <div className={`mx-1 hidden h-px flex-1 sm:block ${step > s.n ? "bg-[var(--green)]" : "bg-[var(--line)]"}`} />
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Step 1 — Amount */}
          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="tf-label">Deposit Amount *</label>
                <div
                  className={`flex items-center gap-0 overflow-hidden rounded-xl border bg-[rgba(5,11,24,0.65)] focus-within:border-[rgba(47,123,255,0.7)] ${
                    amountTooLow
                      ? "border-[var(--red)]"
                      : amountValid
                        ? "border-[var(--blue)]"
                        : "border-[var(--line)]"
                  }`}
                >
                  <span className="shrink-0 select-none pl-4 pr-1 text-lg text-[var(--muted)]">$</span>
                  <input
                    className={`min-h-12 w-full bg-transparent py-2 pr-4 text-lg text-[var(--ink)] outline-none placeholder:text-[var(--muted)] ${
                      amountTooLow ? "text-[var(--red)]" : ""
                    }`}
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => {
                      setError("");
                      setAmount(e.target.value);
                    }}
                  />
                </div>
                <p className={`mt-2 text-xs ${amountTooLow ? "text-[var(--red)]" : "text-[var(--muted)]"}`}>
                  {amountTooLow
                    ? `Minimum deposit is ${formatUsd(minDeposit)}. Increase the amount to continue.`
                    : `Starts at $0.00 · Minimum to continue: ${formatUsd(minDeposit)}`}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {DEPOSIT_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setError("");
                      setAmount(String(p));
                    }}
                    className={`rounded-xl border px-2 py-2.5 text-sm font-semibold transition ${
                      amount === String(p)
                        ? "border-[var(--blue)] bg-[rgba(0,163,255,0.12)] text-white"
                        : "border-[var(--line)] bg-black/20 text-[var(--muted)] hover:border-white/20 hover:text-white"
                    }`}
                  >
                    ${p}
                  </button>
                ))}
              </div>

              {error ? <p className="text-sm text-[var(--red)]">{error}</p> : null}

              <button
                type="button"
                className="tf-btn tf-btn-primary tf-glow w-full !rounded-xl"
                disabled={!amountValid}
                onClick={() => {
                  if (!amountValid) {
                    setError(`Enter at least ${formatUsd(minDeposit)} to continue`);
                    return;
                  }
                  setError("");
                  setStep(2);
                }}
              >
                Continue →
              </button>
            </div>
          ) : null}

          {/* Step 2 — Crypto */}
          {step === 2 ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-black/20 px-4 py-3">
                <span className="text-sm text-[var(--muted)]">Deposit amount</span>
                <span className="inline-flex items-center gap-2 font-semibold">
                  {formatUsd(amountNum)}
                  <button
                    type="button"
                    className="text-xs font-medium text-[var(--blue)]"
                    onClick={() => setStep(1)}
                  >
                    change
                  </button>
                </span>
              </div>

              <div>
                <h3 className="mb-3 font-semibold">Select Cryptocurrency</h3>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {DEPOSIT_ASSETS.map((a) => {
                    const selected = asset === a.symbol;
                    const meta = COIN_META[a.symbol] || { bg: "#334155", label: a.symbol[0] };
                    return (
                      <button
                        key={a.symbol}
                        type="button"
                        onClick={() => setAsset(a.symbol)}
                        className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition sm:p-4 ${
                          selected
                            ? "border-[var(--green)] bg-[rgba(34,197,94,0.08)] shadow-[0_0_18px_rgba(34,197,94,0.25)]"
                            : "border-[var(--line)] bg-black/20 hover:border-white/20"
                        }`}
                      >
                        <span
                          className="grid h-10 w-10 place-items-center rounded-full text-base font-bold text-white"
                          style={{ background: meta.bg }}
                        >
                          {meta.label}
                        </span>
                        <span className="text-sm font-semibold">{a.symbol}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-semibold">Select Network</h3>
                <div className="flex flex-wrap gap-2">
                  {networks.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNetwork(n)}
                      className={`rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                        network === n
                          ? "border-[var(--blue)] bg-[rgba(0,163,255,0.15)] text-white"
                          : "border-[var(--line)] bg-black/20 text-[var(--muted)] hover:text-white"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {error ? <p className="text-sm text-[var(--red)]">{error}</p> : null}

              <button
                type="button"
                className="tf-btn tf-btn-primary tf-glow w-full !rounded-xl"
                disabled={busy || !network}
                onClick={createDeposit}
              >
                {busy ? "Generating…" : "Get Payment Address →"}
              </button>
              <button
                type="button"
                className="w-full text-center text-sm text-[var(--muted)] hover:text-white"
                onClick={() => setStep(1)}
              >
                ← Back
              </button>
            </div>
          ) : null}

          {/* Step 3 — Payment */}
          {step === 3 && deposit ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span
                  className="grid h-11 w-11 place-items-center rounded-full text-lg font-bold text-white"
                  style={{ background: (COIN_META[deposit.asset] || { bg: "#334155" }).bg }}
                >
                  {(COIN_META[deposit.asset] || { label: deposit.asset[0] }).label}
                </span>
                <div>
                  <p className="text-lg font-semibold">
                    {deposit.asset} — {deposit.network}
                  </p>
                  <p className="text-sm text-[var(--muted)]">Send exactly the amount shown below.</p>
                </div>
              </div>

              <div className="flex justify-center rounded-2xl bg-white p-5">
                <QRCodeSVG value={deposit.address} size={180} level="M" />
              </div>

              <div>
                <p className="mb-2 break-all rounded-xl border border-[var(--line)] bg-black/25 px-3 py-3 text-center text-sm font-mono">
                  {deposit.address}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className="tf-btn tf-btn-primary !rounded-xl" onClick={copyAddress}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy Address"}
                  </button>
                  <button type="button" className="tf-btn tf-btn-ghost !rounded-xl" onClick={shareAddress}>
                    <Share2 className="h-4 w-4" /> Share
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[var(--line)] bg-black/20 p-3">
                  <p className="text-[10px] tracking-wider text-[var(--muted)]">SEND AMOUNT</p>
                  <p className="mt-1 break-all text-sm font-bold text-[var(--green)]">
                    {assetUnits(deposit.amountUsd, deposit.asset)} {deposit.asset}
                    {deposit.network === "BEP20" ? "BSC" : ""}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">~{formatUsd(deposit.amountUsd)} USD</p>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-black/20 p-3">
                  <p className="text-[10px] tracking-wider text-[var(--muted)]">EXPIRES IN</p>
                  <p className="mt-1 text-2xl font-bold text-[var(--blue)]">{expireLabel}</p>
                </div>
              </div>

              <div className="rounded-xl border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.08)] px-3 py-3 text-sm text-[var(--green)]">
                Monitoring for payment — will confirm automatically the moment it&apos;s detected.
              </div>

              {error ? <p className="text-sm text-[var(--red)]">{error}</p> : null}

              <button
                type="button"
                className="tf-btn tf-btn-ghost w-full !rounded-xl"
                disabled={busy || deposit.status === "confirmed"}
                onClick={forceCheck}
              >
                <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
                {deposit.status === "confirmed" ? "Payment confirmed" : "Force Check Now"}
              </button>

              <button
                type="button"
                className="w-full text-center text-sm text-[var(--muted)] hover:text-white"
                onClick={startNew}
              >
                — Start a new payment
              </button>
            </div>
          ) : null}
        </div>

        {/* History */}
        <div className="tf-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Deposit History</h2>
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-full border border-[var(--line)] text-[var(--muted)] hover:text-white"
              onClick={loadHistory}
              aria-label="Refresh history"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {history.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <FolderOpen className="h-10 w-10 text-[var(--amber)] opacity-80" />
              <p className="mt-3 text-sm text-[var(--muted)]">No deposits yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-black/15 px-3 py-3"
                >
                  <div>
                    <p className="font-semibold">{formatUsd(d.amountUsd)}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {d.asset} · {d.network}
                      {d.createdAt
                        ? ` · ${new Date(d.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}`
                        : ""}
                    </p>
                  </div>
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${statusBadge(d.status)}`}>
                    {d.status}
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
