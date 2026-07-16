"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { apiFetch } from "@/lib/auth-store";

type App = {
  id: string;
  fullName: string;
  status: string;
  chatPhase: string;
  acknowledgedAt?: string;
  roleApplied: string;
};

export default function AcknowledgePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [app, setApp] = useState<App | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ application: App; acknowledged: boolean }>(
      `/api/careers?ackToken=${encodeURIComponent(token)}`,
    )
      .then((d) => {
        setApp(d.application);
        setDone(Boolean(d.acknowledged));
        if (d.acknowledged) {
          setMessage("You already acknowledged this application. Continue in your interview chat.");
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Invalid link"))
      .finally(() => setLoading(false));
  }, [token]);

  async function confirm() {
    setError("");
    try {
      const data = await apiFetch<{
        application: App;
        message: string;
        interviewLink: string;
      }>("/api/careers", {
        method: "POST",
        body: JSON.stringify({ action: "acknowledge", token }),
      });
      setApp(data.application);
      setMessage(data.message);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader solid variant="careers" />
      <div className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-2xl font-bold">Acknowledge application</h1>
        {loading ? <p className="mt-3 text-sm text-[var(--muted)]">Loading…</p> : null}
        {error ? <p className="mt-3 text-sm text-[var(--red)]">{error}</p> : null}
        {app ? (
          <div className="tf-card mt-4 space-y-3 p-5">
            <p className="text-sm text-[var(--muted)]">
              Hi <strong className="text-white">{app.fullName}</strong> — role:{" "}
              <strong className="text-white">{app.roleApplied}</strong>
            </p>
            <p className="text-sm text-[var(--muted)]">
              Confirm you received approval and wish to proceed with onboarding (including the $1,500
              first trading deposit steps).
            </p>
            {!done ? (
              <button type="button" className="tf-btn tf-btn-primary" onClick={confirm}>
                I acknowledge my application
              </button>
            ) : (
              <>
                <p className="text-sm text-[var(--green,#22c55e)]">{message || "Acknowledged."}</p>
                <Link href={`/careers/interview/${app.id}`} className="tf-btn tf-btn-primary inline-flex">
                  Continue in chat — share your address
                </Link>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
