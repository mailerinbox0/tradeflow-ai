"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { apiFetch, useAuth } from "@/lib/auth-store";
import { COUNTRY_OPTIONS } from "@/lib/constants";

function initials(name?: string | null) {
  const parts = String(name || "U").trim().split(/\s+/);
  return ((parts[0]?.[0] || "U") + (parts[1]?.[0] || "")).toUpperCase();
}

function splitName(full?: string | null) {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] || "", last: parts.slice(1).join(" ") || "" };
}

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[var(--blue)] focus:ring-2 focus:ring-[rgba(0,163,255,0.2)]";

export default function ProfilePage() {
  const router = useRouter();
  const { token, user, updateUser, clear } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdOk, setPwdOk] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (!token) {
      router.replace("/auth/login");
      return;
    }
    let alive = true;
    (async () => {
      try {
        const data = await apiFetch<{
          user: { fullName: string; email: string; phone?: string; country: string };
        }>("/api/me", { token });
        if (!alive) return;
        const n = splitName(data.user.fullName);
        setFirstName(n.first);
        setLastName(n.last);
        setPhone(data.user.phone || "");
        setCountry(data.user.country || "");
        setEmail(data.user.email);
        setError("");
        updateUser({
          fullName: data.user.fullName,
          country: data.user.country,
          phone: data.user.phone,
          email: data.user.email,
        });
      } catch (err) {
        if (!alive) return;
        const msg = err instanceof Error ? err.message : "Failed to load";
        setError(msg);
        if (msg.toLowerCase().includes("unauthorized")) {
          clear();
          router.replace("/auth/login");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, router, updateUser, clear]);

  useEffect(() => {
    if (!user) return;
    if (!firstName && !lastName) {
      const n = splitName(user.fullName);
      setFirstName(n.first);
      setLastName(n.last);
    }
    if (!email) setEmail(user.email || "");
    if (!country && user.country) setCountry(user.country);
    if (!phone && user.phone) setPhone(user.phone);
  }, [user, firstName, lastName, email, country, phone]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    setBusy(true);
    try {
      const data = await apiFetch<{
        message?: string;
        user: {
          fullName: string;
          phone?: string;
          country: string;
          email: string;
          balanceUsd: number;
          role: string;
        };
      }>("/api/me", {
        method: "PATCH",
        token,
        body: JSON.stringify({ firstName, lastName, phone, country, email }),
      });
      updateUser({
        fullName: data.user.fullName,
        phone: data.user.phone,
        country: data.user.country,
        email: data.user.email,
      });
      setEmail(data.user.email);
      setOk(data.message || "Profile saved");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setError(msg);
      if (msg.toLowerCase().includes("unauthorized")) {
        clear();
        router.replace("/auth/login");
      }
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdError("");
    setPwdOk("");
    if (newPassword.length < 8) {
      setPwdError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("New password confirmation does not match");
      return;
    }
    setPwdBusy(true);
    try {
      await apiFetch("/api/me", {
        method: "PATCH",
        token,
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      setPwdOk("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Password update failed";
      setPwdError(msg);
      if (msg.toLowerCase().includes("unauthorized")) {
        clear();
        router.replace("/auth/login");
      }
    } finally {
      setPwdBusy(false);
    }
  }

  const displayName = `${firstName} ${lastName}`.trim() || user?.fullName || "Trader";

  return (
    <AppShell title="Profile">
      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <h2 className="text-xl font-bold">Account Settings</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Manage your profile and security</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-[#dcfce7] text-lg font-bold text-[#166534]">
              {initials(displayName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold capitalize text-slate-900">{displayName}</p>
              <p className="truncate text-sm text-slate-500">{email || user?.email}</p>
            </div>
          </div>
        </div>

        <form onSubmit={saveProfile} className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-5 text-base font-bold text-slate-900">Personal Information</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-800">First Name</label>
              <input className={fieldClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-800">Last Name</label>
              <input className={fieldClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-800">Email</label>
            <input
              className={fieldClass}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
            <p className="mt-1 text-xs text-slate-500">Used for login and notifications.</p>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-800">Phone</label>
            <input
              className={fieldClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 000 0000"
            />
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-800">Country</label>
            <select className={fieldClass} value={country} onChange={(e) => setCountry(e.target.value)} required>
              <option value="">Select country</option>
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {country && !(COUNTRY_OPTIONS as readonly string[]).includes(country) ? (
                <option value={country}>{country}</option>
              ) : null}
            </select>
          </div>

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          {ok ? <p className="mt-3 text-sm text-emerald-600">{ok}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="mt-5 rounded-xl bg-[var(--green)] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save Changes"}
          </button>
        </form>

        <form onSubmit={savePassword} className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-2 text-base font-bold text-slate-900">Change Password</h3>
          <p className="mb-5 text-sm text-slate-500">Enter your current password, then choose a new one.</p>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-800">Current password</label>
            <div className="relative">
              <input
                className={`${fieldClass} pr-11`}
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                onClick={() => setShowCurrent((v) => !v)}
                aria-label="Toggle current password"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-800">New password</label>
              <div className="relative">
                <input
                  className={`${fieldClass} pr-11`}
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  onClick={() => setShowNew((v) => !v)}
                  aria-label="Toggle new password"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-800">Confirm new password</label>
              <input
                className={fieldClass}
                type={showNew ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>

          {pwdError ? <p className="mt-3 text-sm text-red-600">{pwdError}</p> : null}
          {pwdOk ? <p className="mt-3 text-sm text-emerald-600">{pwdOk}</p> : null}

          <button
            type="submit"
            disabled={pwdBusy}
            className="mt-5 rounded-xl bg-[var(--blue)] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {pwdBusy ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
