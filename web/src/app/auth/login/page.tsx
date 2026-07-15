"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { apiFetch, useAuth } from "@/lib/auth-store";

/** Public trader / customer sign-in — admin login is a separate private route. */
function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
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

  useEffect(() => {
    // Old shared link — send admins to the private console login
    if (search.get("as") === "admin") {
      router.replace("/admin/login");
    }
  }, [search, router]);

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
          expectedRole: "user",
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
          expectedRole: "user",
        }),
      });
      if (data.user.role === "admin") {
        clear();
        setError("Use the admin console login for staff accounts.");
        setStep("form");
        return;
      }
      setSession(data.token, data.user);
      router.push("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader solid />
      <div className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-3xl font-bold">Sign in</h1>
        <p className="mt-2 text-[var(--muted)]">Email + password, then verification code.</p>

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
              <input className="tf-input" required value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            {error ? <p className="text-sm text-[var(--red)]">{error}</p> : null}
            <button className="tf-btn tf-btn-primary w-full" disabled={loading} type="submit">
              Verify & Enter
            </button>
            <button type="button" className="tf-btn tf-btn-ghost w-full" onClick={() => setStep("form")}>
              Back
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          New here?{" "}
          <Link className="text-[var(--blue)]" href="/auth/signup">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[var(--muted)]">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
