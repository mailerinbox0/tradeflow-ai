"use client";

import { useMemo, useState } from "react";
import { countries } from "countries-list";
import { SiteHeader } from "@/components/SiteHeader";
import { apiFetch } from "@/lib/auth-store";

const ROLES = [
  {
    title: "Visual Assistant",
    weekly: "$1,000",
    weeklyPayUsd: 1000,
    blurb: "Create and refine visual assets that keep TradeFlow AI looking sharp across campaigns.",
  },
  {
    title: "Social Media Manager",
    weekly: "$1,000",
    weeklyPayUsd: 1000,
    blurb: "Grow and manage TradeFlow AI’s social presence with clear, professional content.",
  },
  {
    title: "Remote Community Marketing Representative",
    weekly: "$800",
    weeklyPayUsd: 800,
    blurb: "Promote TradeFlow AI in communities, answer basic questions, and share referral links.",
  },
] as const;

export default function CareersPage() {
  const countryList = useMemo(
    () =>
      Object.values(countries)
        .map((c) => c.name)
        .sort((a, b) => a.localeCompare(b)),
    [],
  );
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    country: "",
    phone: "",
    experience: "",
    roleApplied: "",
  });
  const [done, setDone] = useState<{
    id: string;
    interviewAt: string;
    confirmSendAt: string;
    roleApplied: string;
    interviewLink: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selected = ROLES.find((r) => r.title === form.roleApplied);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.roleApplied) {
      setError("Select the role you are applying for before submitting");
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<{
        application: {
          id: string;
          interviewAt: string;
          confirmSendAt: string;
          roleApplied: string;
        };
        schedule?: { interviewLink?: string };
      }>("/api/careers", {
        method: "POST",
        body: JSON.stringify({ action: "apply", ...form }),
      });
      const interviewLink =
        data.schedule?.interviewLink ||
        `${typeof window !== "undefined" ? window.location.origin : ""}/careers/interview/${data.application.id}`;
      setDone({
        id: data.application.id,
        interviewAt: data.application.interviewAt,
        confirmSendAt: data.application.confirmSendAt,
        roleApplied: data.application.roleApplied,
        interviewLink,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader solid variant="careers" />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-[var(--blue)]">TradeFlow AI · Employment · Fully Remote</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Open roles at TradeFlow AI</h1>
        <p className="mt-3 text-[var(--muted)]">
          Crypto & Trading Platform · Full-Time or Part-Time · Select a role before you apply
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-1 lg:grid-cols-3">
          {ROLES.map((role) => (
            <button
              key={role.title}
              type="button"
              className={`tf-card p-5 text-left transition ${
                form.roleApplied === role.title ? "border-[var(--blue)] ring-1 ring-[var(--blue)]" : "hover:border-white/20"
              }`}
              onClick={() => setForm((f) => ({ ...f, roleApplied: role.title }))}
            >
              <p className="text-base font-semibold leading-snug">{role.title}</p>
              <p className="mt-2 text-2xl font-bold text-[var(--blue)]">
                {role.weekly}
                <span className="text-sm font-medium text-[var(--muted)]"> / week</span>
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">{role.blurb}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-[var(--blue)]">
                {form.roleApplied === role.title ? "Selected" : "Tap to select"}
              </p>
            </button>
          ))}
        </div>

        {!done ? (
          <form id="apply" className="tf-card mt-8 space-y-4 p-5" onSubmit={submit}>
            <h2 className="text-lg font-semibold">Apply now</h2>
            <div>
              <label className="tf-label">Role applying for</label>
              <select
                className="tf-input"
                required
                value={form.roleApplied}
                onChange={(e) => setForm({ ...form, roleApplied: e.target.value })}
              >
                <option value="">Select a role</option>
                {ROLES.map((r) => (
                  <option key={r.title} value={r.title}>
                    {r.title} — {r.weekly} / week
                  </option>
                ))}
              </select>
              {selected ? (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Weekly pay for this role: <strong className="text-white">{selected.weekly}</strong>
                </p>
              ) : (
                <p className="mt-1 text-xs text-[var(--muted)]">Choose a role above or from this list first.</p>
              )}
            </div>
            <div>
              <label className="tf-label">Full name</label>
              <input
                className="tf-input"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="tf-label">Email</label>
              <input
                className="tf-input"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="tf-label">Country</label>
              <select
                className="tf-input"
                required
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              >
                <option value="">Select country</option>
                {countryList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="tf-label">Phone</label>
              <input
                className="tf-input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="tf-label">Experience / portfolio links</label>
              <textarea
                className="tf-input !min-h-28 py-3"
                value={form.experience}
                onChange={(e) => setForm({ ...form, experience: e.target.value })}
              />
            </div>
            {error ? <p className="text-sm text-[var(--red)]">{error}</p> : null}
            <button className="tf-btn tf-btn-primary w-full" type="submit" disabled={loading}>
              {loading ? "Submitting…" : "Submit application"}
            </button>
          </form>
        ) : (
          <div className="tf-card mt-8 space-y-3 p-5">
            <p className="text-lg font-semibold text-[var(--green)]">Application submitted</p>
            <p className="text-sm text-[var(--muted)]">
              Thanks for applying for{" "}
              <strong className="text-white">{done.roleApplied}</strong>
              {ROLES.find((r) => r.title === done.roleApplied)
                ? ` (${ROLES.find((r) => r.title === done.roleApplied)!.weekly} / week)`
                : null}
              .
            </p>
            <p className="text-sm text-[var(--muted)]">
              We will also email you your interview details. Your personal interview chat link:
            </p>
            <a
              href={done.interviewLink}
              className="block break-all text-sm font-medium text-[var(--blue)] underline"
            >
              {done.interviewLink}
            </a>
            <a href={done.interviewLink} className="tf-btn tf-btn-primary inline-flex">
              Open interview chat
            </a>
            <p className="text-xs text-[var(--muted)]">
              Interview time: {new Date(done.interviewAt).toLocaleString()}. Chat unlocks around that
              time (confirmation email first).
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
