"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { countries } from "countries-list";
import {
  ArrowRight,
  Bot,
  Eye,
  EyeOff,
  HeartPulse,
  Lock,
  Shield,
  UserRound,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { apiFetch, useAuth } from "@/lib/auth-store";

const PHONE_CODES = [
  { code: "+1", label: "US +1" },
  { code: "+44", label: "UK +44" },
  { code: "+234", label: "NG +234" },
  { code: "+91", label: "IN +91" },
  { code: "+971", label: "AE +971" },
  { code: "+27", label: "ZA +27" },
  { code: "+233", label: "GH +233" },
  { code: "+254", label: "KE +254" },
  { code: "+61", label: "AU +61" },
  { code: "+49", label: "DE +49" },
];

export default function SignupPage() {
  const router = useRouter();
  const setSession = useAuth((s) => s.setSession);
  const countryList = useMemo(
    () => Object.values(countries).map((c) => c.name).sort((a, b) => a.localeCompare(b)),
    [],
  );
  const [step, setStep] = useState<"form" | "otp">("form");
  const [demoCode, setDemoCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    country: "",
    phoneCode: "+1",
    phone: "",
    code: "",
  });

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch<{ demoCode?: string }>("/api/auth", {
        method: "POST",
        body: JSON.stringify({
          action: "request-signup-otp",
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          country: form.country,
          phoneCode: form.phoneCode,
          phone: form.phone,
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
        body: JSON.stringify({ action: "verify-signup", email: form.email, code: form.code }),
      });
      setSession(data.token, data.user);
      router.push("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:py-14">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[rgba(0,163,255,0.14)] blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-20 h-80 w-80 rounded-full bg-[rgba(0,163,255,0.12)] blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-48 w-48 -translate-x-1/2 rounded-full bg-[rgba(34,197,94,0.07)] blur-3xl" />

      <div className="pointer-events-none absolute left-5 top-10 hidden rounded-xl border border-[rgba(0,163,255,0.35)] bg-[rgba(5,11,24,0.75)] px-3.5 py-2.5 text-sm font-semibold text-[var(--blue)] backdrop-blur sm:block">
        +340% avg return
      </div>
      <div className="pointer-events-none absolute bottom-24 left-8 hidden rounded-xl border border-[rgba(0,163,255,0.35)] bg-[rgba(5,11,24,0.75)] px-3.5 py-2.5 text-sm font-semibold text-[var(--blue)] backdrop-blur md:block">
        94.2% win rate
      </div>
      <div className="pointer-events-none absolute bottom-16 right-8 hidden rounded-xl border border-[rgba(0,163,255,0.35)] bg-[rgba(5,11,24,0.75)] px-3.5 py-2.5 text-sm font-semibold text-[var(--blue)] backdrop-blur md:block">
        15,344 active traders
      </div>

      <div className="relative mx-auto w-full max-w-[560px] origin-center sm:scale-[1.03] lg:scale-[1.06]">
        <div className="rounded-3xl border border-[rgba(0,163,255,0.4)] bg-[rgba(8,14,28,0.95)] p-6 shadow-[0_0_70px_rgba(0,163,255,0.28)] backdrop-blur-md sm:p-9">
          <div className="mb-6 flex items-start justify-between gap-3">
            <BrandLogo href="/" size="md" />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(0,163,255,0.45)] px-3 py-1.5 text-[11px] font-bold tracking-wide text-[var(--blue)]">
              <UserRound className="h-4 w-4" /> FREE ACCOUNT
            </span>
          </div>

          <p className="text-xs font-bold tracking-[0.16em] text-[var(--blue)] sm:text-sm">PROFESSIONAL TRADING</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-tight">
            Start trading <span className="text-[var(--blue)]">smarter</span>
          </h1>
          <p className="mt-3 text-base text-[var(--muted)]">
            Create your TradeFlow AI account in under 2 minutes
          </p>

          <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
            {[
              { icon: Bot, label: "AI-powered trading bot" },
              { icon: Shield, label: "Bank-grade encryption" },
              { icon: HeartPulse, label: "150+ trading pairs" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2 rounded-xl border border-[rgba(0,163,255,0.3)] bg-[rgba(0,163,255,0.08)] px-3 py-2.5 text-xs leading-snug text-[var(--muted)]"
              >
                <f.icon className="h-4 w-4 shrink-0 text-[var(--blue)]" />
                {f.label}
              </div>
            ))}
          </div>

          {step === "form" ? (
            <form className="mt-7 space-y-4" onSubmit={requestOtp}>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="tf-label !text-sm">First name</label>
                  <input
                    className="tf-input !min-h-12 !rounded-xl !text-base"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="tf-label !text-sm">Last name</label>
                  <input
                    className="tf-input !min-h-12 !rounded-xl !text-base"
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="tf-label !text-sm">Email address</label>
                <input
                  className="tf-input !min-h-12 !rounded-xl !text-base"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="tf-label !text-sm">Password</label>
                <div className="relative">
                  <input
                    className="tf-input !min-h-12 !rounded-xl !pr-12 !text-base"
                    type={showPass ? "text" : "password"}
                    required
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min. 8 characters"
                  />
                  <button
                    type="button"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="tf-label !text-sm">Country</label>
                <select
                  className="tf-input !min-h-12 !rounded-xl !text-base"
                  required
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                >
                  <option value="">Select your country</option>
                  {countryList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="tf-label !text-sm">Phone number</label>
                <div className="flex gap-2.5">
                  <select
                    className="tf-input !min-h-12 !w-[8rem] shrink-0 !rounded-xl !text-base"
                    value={form.phoneCode}
                    onChange={(e) => setForm({ ...form, phoneCode: e.target.value })}
                  >
                    {PHONE_CODES.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="tf-input !min-h-12 !rounded-xl !text-base"
                    inputMode="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="555 123 4567"
                  />
                </div>
              </div>

              {error ? <p className="text-sm text-[var(--red)]">{error}</p> : null}

              <button
                className="tf-btn tf-btn-primary tf-glow mt-2 w-full !min-h-12 !rounded-xl !text-base !font-bold"
                disabled={loading}
                type="submit"
              >
                {loading ? "Sending code…" : "Create Free Account"}
                {!loading ? <ArrowRight className="h-5 w-5" /> : null}
              </button>

              <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 pt-2 text-xs text-[var(--muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-[var(--green)]" /> No credit card
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-[var(--green)]" /> Bank-grade security
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--green)]" /> Setup in 2 min
                </span>
              </div>
            </form>
          ) : (
            <form className="mt-7 space-y-4" onSubmit={verify}>
              <p className="text-base text-[var(--muted)]">
                Enter the email verification code sent to <strong className="text-white">{form.email}</strong>.
              </p>
              {demoCode ? (
                <p className="rounded-xl border border-[rgba(0,163,255,0.3)] bg-[rgba(0,163,255,0.08)] p-4 text-base">
                  Demo code: <strong className="text-[var(--blue)]">{demoCode}</strong>
                </p>
              ) : null}
              <div>
                <label className="tf-label !text-sm">Verification code</label>
                <input
                  className="tf-input !min-h-12 !rounded-xl !text-base"
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="6-digit code"
                />
              </div>
              {error ? <p className="text-sm text-[var(--red)]">{error}</p> : null}
              <button
                className="tf-btn tf-btn-primary w-full !min-h-12 !rounded-xl !text-base"
                disabled={loading}
                type="submit"
              >
                {loading ? "Verifying…" : "Verify & Continue"}
              </button>
              <button
                type="button"
                className="tf-btn tf-btn-ghost w-full !min-h-12 !rounded-xl"
                onClick={() => setStep("form")}
              >
                Back
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-base text-[var(--muted)]">
            Already have an account?{" "}
            <Link className="font-semibold text-[var(--blue)]" href="/auth/login">
              Sign In →
            </Link>
          </p>
          <p className="mt-3 text-center text-xs leading-relaxed text-[var(--muted)]">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
