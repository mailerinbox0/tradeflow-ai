"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { apiFetch, useAuth } from "@/lib/auth-store";

/**
 * Private admin entry — not linked from the public trader login.
 * Path: /admin/login
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const setSession = useAuth((s) => s.setSession);
  const clear = useAuth((s) => s.clear);
  const existing = useAuth((s) => s.user);
  const [step, setStep] = useState<"form" | "otp">("form");
  const [demoCode, setDemoCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      clear();
      const data = await apiFetch<{ demoCode?: string }>("/api/auth", {
        method: "POST",
        body: JSON.stringify({
          action: "request-login-otp",
          email,
          password,
          expectedRole: "admin",
        }),
      });
      setDemoCode(data.demoCode || "");
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch<{
        token: string;
        user: {
          id: string;
          email: string;
          fullName: string;
          role: string;
          balanceUsd: number;
          country: string;
        };
      }>("/api/auth", {
        method: "POST",
        body: JSON.stringify({
          action: "verify-login",
          email,
          code,
          expectedRole: "admin",
        }),
      });
      if (data.user.role !== "admin") {
        clear();
        setError("Admin access only");
        setStep("form");
        return;
      }
      setSession(data.token, data.user);
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#070b14]">
      <header className="border-b border-white/5 px-4 py-4">
        <BrandLogo href="/" size="sm" />
      </header>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Operations console</p>
        <h1 className="mt-2 text-3xl font-bold">Admin sign in</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Restricted access. Use your admin credentials and verification code.
        </p>

        {existing ? (
          <p className="mt-3 rounded-lg border border-[var(--line)] bg-black/20 p-3 text-sm text-[var(--muted)]">
            Currently signed in as <strong className="text-white">{existing.email}</strong>. Continuing will
            replace that session.
          </p>
        ) : null}

        {step === "form" ? (
          <form className="mt-6 space-y-4" onSubmit={requestOtp}>
            <div>
              <label className="tf-label">Email</label>
              <input
                className="tf-input"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="tf-label">Password</label>
              <input
                className="tf-input"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-[var(--red)]">{error}</p> : null}
            <button className="tf-btn tf-btn-primary w-full" disabled={loading} type="submit">
              {loading ? "Checking…" : "Continue"}
            </button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={verify}>
            {demoCode ? (
              <p className="rounded-lg border border-[var(--line)] p-3 text-sm">
                Demo code: <strong>{demoCode}</strong>
              </p>
            ) : null}
            <div>
              <label className="tf-label">Verification code</label>
              <input
                className="tf-input"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-[var(--red)]">{error}</p> : null}
            <button className="tf-btn tf-btn-primary w-full" disabled={loading} type="submit">
              Verify & enter admin
            </button>
            <button type="button" className="tf-btn tf-btn-ghost w-full" onClick={() => setStep("form")}>
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
