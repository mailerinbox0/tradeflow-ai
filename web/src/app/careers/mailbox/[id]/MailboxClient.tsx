"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { apiFetch } from "@/lib/auth-store";

type MailMsg = {
  id: string;
  threadId: string;
  direction: "outbound" | "inbound";
  from: string;
  to: string;
  subject: string;
  body: string;
  createdAt: string;
};

type MailThread = {
  id: string;
  subject: string;
  status: string;
  lastMessageAt: string;
};

export default function ApplicantMailboxPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [threads, setThreads] = useState<MailThread[]>([]);
  const [messages, setMessages] = useState<MailMsg[]>([]);
  const [threadId, setThreadId] = useState("");
  const [reply, setReply] = useState("");
  const [subject, setSubject] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const data = await apiFetch<{
      application: { fullName: string; email: string };
      threads: MailThread[];
      messages: MailMsg[];
    }>("/api/careers", {
      method: "POST",
      body: JSON.stringify({ action: "mail-inbox", id }),
    });
    setName(data.application.fullName);
    setEmail(data.application.email);
    setThreads(data.threads || []);
    setMessages(data.messages || []);
    setThreadId((prev) => prev || data.threads?.[0]?.id || "");
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load mailbox"))
      .finally(() => setLoading(false));
    const t = setInterval(() => {
      load().catch(() => undefined);
    }, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || sending) return;
    setSending(true);
    setError("");
    setNote("");
    try {
      await apiFetch("/api/careers", {
        method: "POST",
        body: JSON.stringify({
          action: "mail-reply",
          id,
          threadId: threadId || undefined,
          subject: threadId ? undefined : subject || "Message to TradeFlow Hiring",
          body: reply.trim(),
        }),
      });
      setReply("");
      setSubject("");
      setNote("Message sent to hiring team");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  const visible = messages
    .filter((m) => (threadId ? m.threadId === threadId : true))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <div className="min-h-screen">
      <SiteHeader solid variant="careers" />
      <div className="mx-auto max-w-3xl px-4 py-6">
        <p className="text-xs uppercase tracking-wider text-[var(--blue)]">Demo mailbox</p>
        <h1 className="text-2xl font-bold">Hiring email</h1>
        <p className="text-sm text-[var(--muted)]">
          {name ? `${name} · ${email}` : "Loading…"} — continue the conversation with TradeFlow hiring by email.
        </p>
        {error ? <p className="mt-2 text-sm text-[var(--red)]">{error}</p> : null}
        {note ? <p className="mt-2 text-sm text-emerald-300">{note}</p> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-[220px_1fr]">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Threads</p>
            {loading ? <p className="text-xs text-[var(--muted)]">Loading…</p> : null}
            {threads.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`tf-card w-full p-3 text-left text-sm ${
                  threadId === t.id ? "ring-1 ring-[var(--blue)]" : ""
                }`}
                onClick={() => setThreadId(t.id)}
              >
                <p className="truncate font-semibold">{t.subject}</p>
                <p className="text-[10px] text-[var(--muted)]">
                  {t.status} · {new Date(t.lastMessageAt).toLocaleString()}
                </p>
              </button>
            ))}
            {threads.length === 0 && !loading ? (
              <p className="text-xs text-[var(--muted)]">No hiring emails yet. You can still write below.</p>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="tf-card max-h-[50vh] space-y-3 overflow-y-auto p-4">
              {visible.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No messages in this thread.</p>
              ) : (
                visible.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-xl p-3 text-sm ${
                      m.direction === "outbound"
                        ? "mr-6 bg-[rgba(47,123,255,0.15)]"
                        : "ml-6 bg-[rgba(34,197,94,0.15)]"
                    }`}
                  >
                    <div className="flex flex-wrap justify-between gap-2 text-[10px] text-[var(--muted)]">
                      <span>{m.direction === "outbound" ? "TradeFlow Hiring" : "You"}</span>
                      <span>{new Date(m.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold">{m.subject}</p>
                    <p className="mt-2 whitespace-pre-wrap">{m.body}</p>
                  </div>
                ))
              )}
            </div>

            <form className="tf-card space-y-3 p-4" onSubmit={sendReply}>
              <h2 className="font-semibold">Write email</h2>
              {!threadId ? (
                <input
                  className="tf-input"
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              ) : null}
              <textarea
                className="tf-input min-h-[120px]"
                placeholder="Your reply to hiring…"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
              <button className="tf-btn tf-btn-primary" type="submit" disabled={sending || !reply.trim()}>
                {sending ? "Sending…" : "Send email"}
              </button>
            </form>

            <Link href={`/careers/interview/${id}`} className="tf-btn tf-btn-ghost inline-flex text-sm">
              Back to interview chat
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
