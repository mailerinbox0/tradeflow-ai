"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { AiTypingBubble } from "@/components/AiTypingBubble";
import { LiveChatBubble, type LiveChatAttachment, type LiveChatMsg } from "@/components/LiveChatBubble";
import { apiFetch } from "@/lib/auth-store";
import { clientTimezone, typingDelayMs, withApplicantChatTiming, withMinDelay } from "@/lib/typing-delay";

type BotMsg = { id: string; kind: string; body: string; sendAt: string; status: string; sentAt?: string };
type App = {
  id: string;
  status: string;
  interviewAt: string;
  confirmSendAt: string;
  confirmSentAt?: string;
  missedCount?: number;
  chatPhase?: string;
  approvalEmailSendAt?: string;
  approvalEmailSentAt?: string;
};

const MAX_FILE_BYTES = 2_400_000;

async function readFilesAsAttachments(files: FileList | File[]): Promise<LiveChatAttachment[]> {
  const list = Array.from(files).slice(0, 4);
  const out: LiveChatAttachment[] = [];
  for (const file of list) {
    if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is too large (max ~2MB)`);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
      reader.readAsDataURL(file);
    });
    out.push({
      name: file.name,
      mime: file.type || "application/octet-stream",
      size: file.size,
      dataUrl,
    });
  }
  return out;
}

export default function InterviewPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [messages, setMessages] = useState<LiveChatMsg[]>([]);
  const [botMessages, setBotMessages] = useState<BotMsg[]>([]);
  const [app, setApp] = useState<App | null>(null);
  const [waiting, setWaiting] = useState(true);
  const [status, setStatus] = useState("");
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<LiveChatAttachment[]>([]);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [aiTyping, setAiTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const busyRef = useRef(false);
  const openedWithTypingRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function refresh(forceEarly = false) {
    if (busyRef.current) return;
    await apiFetch("/api/careers", {
      method: "POST",
      body: JSON.stringify({ action: "tick", id }),
    }).catch(() => undefined);

    const data = await apiFetch<{
      messages: LiveChatMsg[];
      application: App;
      botMessages?: BotMsg[];
      waiting?: boolean;
      message?: string;
    }>("/api/careers", {
      method: "POST",
      body: JSON.stringify({ action: "start-interview", id, forceEarly, timezone: clientTimezone() }),
    });

    setApp(data.application);
    setStatus(data.application.status);
    setBotMessages(data.botMessages || []);
    const isWaiting = Boolean(data.waiting);
    setWaiting(isWaiting);
    if (data.message && isWaiting) setError("");

    if (busyRef.current) return;

    const msgs = data.messages || [];
    if (
      !isWaiting &&
      !openedWithTypingRef.current &&
      msgs.filter((m) => m.role === "applicant").length === 0 &&
      msgs.some((m) => m.role === "assistant" || m.role === "system") &&
      messages.length === 0
    ) {
      openedWithTypingRef.current = true;
      busyRef.current = true;
      setAiTyping(true);
      await withMinDelay(Promise.resolve(null), typingDelayMs());
      setMessages(msgs);
      setAiTyping(false);
      busyRef.current = false;
      return;
    }

    if (!busyRef.current) setMessages(msgs);
  }

  useEffect(() => {
    refresh().catch((err) => setError(err.message));
    const t = setInterval(() => {
      setNow(Date.now());
      refresh().catch(() => undefined);
    }, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiTyping, pendingFiles]);

  async function onPickFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setError("");
    try {
      const atts = await readFilesAsAttachments(fileList);
      setPendingFiles((prev) => [...prev, ...atts].slice(0, 4));
    } catch (err) {
      setError(err instanceof Error ? err.message : "File upload failed");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (
      app?.chatPhase === "awaiting_feedback" ||
      (!input.trim() && !pendingFiles.length) ||
      sending ||
      aiTyping ||
      busyRef.current
    ) {
      return;
    }
    const content = input.trim();
    const attachments = [...pendingFiles];
    const tempId = `local_${Date.now()}`;
    busyRef.current = true;
    setSending(true);
    setError("");
    setInput("");
    setPendingFiles([]);
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        role: "applicant",
        content: content || (attachments.length ? "Sent an attachment" : ""),
        createdAt: new Date().toISOString(),
        status: "sent",
        attachments,
      },
    ]);
    try {
      const data = await withApplicantChatTiming(
        apiFetch<{ messages: LiveChatMsg[]; application: App }>("/api/careers", {
          method: "POST",
          body: JSON.stringify({ action: "chat", id, content, attachments }),
        }),
        {
          onDoubleTick: () => {
            setMessages((prev) =>
              prev.map((m) => (m.id === tempId && m.status === "sent" ? { ...m, status: "delivered" } : m)),
            );
          },
          onBlueTick: () => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempId && (m.status === "sent" || m.status === "delivered")
                  ? { ...m, status: "seen" }
                  : m,
              ),
            );
          },
          onTypingStart: () => setAiTyping(true),
        },
      );
      const latest = await apiFetch<{ messages: LiveChatMsg[]; application: App }>(
        `/api/careers?id=${encodeURIComponent(id)}`,
      ).catch(() => null);
      setMessages(latest?.messages || data.messages);
      setStatus((latest?.application || data.application).status);
      setApp(latest?.application || data.application);
      setWaiting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(content);
      setPendingFiles(attachments);
    } finally {
      setAiTyping(false);
      setSending(false);
      busyRef.current = false;
    }
  }

  const interviewMs = app ? new Date(app.interviewAt).getTime() : 0;
  const confirmMs = app ? new Date(app.confirmSendAt).getTime() : 0;
  const minsToInterview = Math.max(0, Math.ceil((interviewMs - now) / 60000));
  const minsToConfirm = Math.max(0, Math.ceil((confirmMs - now) / 60000));
  const chatClosed = app?.chatPhase === "awaiting_feedback";
  const locked = chatClosed || app?.chatPhase === "awaiting_ack" || sending || aiTyping;

  return (
    <div className="min-h-screen">
      <SiteHeader solid variant="careers" />
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col px-4 py-6">
        <h1 className="text-2xl font-bold">Interview live chat</h1>
        <p className="text-sm text-[var(--muted)]">Status: {status || "…"}</p>
        {error ? <p className="text-sm text-[var(--red)]">{error}</p> : null}

        {app ? (
          <div className="tf-card mt-3 space-y-2 p-4 text-sm text-[var(--muted)]">
            <p>
              Appointment:{" "}
              <strong className="text-white">{new Date(app.interviewAt).toLocaleString()}</strong>
              {!waiting ? null : minsToInterview > 0 ? ` · opens in ~${minsToInterview} min` : " · ready"}
            </p>
            <p>
              Bot confirm:{" "}
              {app.confirmSentAt
                ? `sent ${new Date(app.confirmSentAt).toLocaleString()}`
                : `queued · ~${minsToConfirm} min remaining`}
            </p>
            {(app.missedCount || 0) > 0 ? (
              <p className="text-[var(--amber,#f59e0b)]">
                Missed appointments: {app.missedCount}. You’ll get a reschedule reminder.
              </p>
            ) : null}
          </div>
        ) : null}

        {botMessages.length > 0 ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Email messages
            </p>
            {botMessages.slice(0, 3).map((m) => (
              <div key={m.id} className="rounded-xl border border-[var(--line)] bg-black/20 p-3 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="font-semibold uppercase text-[var(--blue)]">{m.kind}</span>
                  <span className="text-[var(--muted)]">{m.status}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-all text-[var(--muted)]">{m.body}</p>
              </div>
            ))}
          </div>
        ) : null}

        {waiting ? (
          <div className="tf-card mt-4 space-y-3 p-5">
            <p className="font-semibold">Waiting room</p>
            <p className="text-sm text-[var(--muted)]">
              Your interview opens at the scheduled time. Stay on this page — chat unlocks when ready.
            </p>
            <button
              type="button"
              className="tf-btn tf-btn-ghost"
              onClick={() => refresh(true).catch((err) => setError(err.message))}
            >
              Start early (demo)
            </button>
            <Link href="/careers" className="tf-btn tf-btn-ghost inline-flex">
              Back to employment page
            </Link>
          </div>
        ) : (
          <>
            <div className="tf-card mt-4 flex flex-1 flex-col overflow-hidden p-0">
              <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ minHeight: "45vh" }}>
                {messages.map((m, i) => (
                  <LiveChatBubble key={m.id || `${m.role}-${i}`} message={m} />
                ))}
                {aiTyping ? <AiTypingBubble /> : null}
                <div ref={bottomRef} />
              </div>

              {pendingFiles.length > 0 ? (
                <div className="flex flex-wrap gap-2 border-t border-[var(--line)] px-3 pt-3">
                  {pendingFiles.map((f, i) => (
                    <div
                      key={`${f.name}-${i}`}
                      className="relative max-w-[120px] overflow-hidden rounded-lg border border-[var(--line)] bg-black/30"
                    >
                      {f.mime.startsWith("image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.dataUrl} alt={f.name} className="h-16 w-full object-cover" />
                      ) : (
                        <p className="truncate px-2 py-3 text-[10px] text-[var(--muted)]">{f.name}</p>
                      )}
                      <button
                        type="button"
                        className="absolute right-1 top-1 rounded bg-black/70 px-1 text-[10px] text-white"
                        onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <form className="flex items-end gap-2 border-t border-[var(--line)] p-3" onSubmit={send}>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp"
                  multiple
                  className="hidden"
                  onChange={(e) => onPickFiles(e.target.files)}
                />
                <button
                  type="button"
                  className="tf-btn tf-btn-ghost !min-h-11 !px-3"
                  disabled={locked}
                  onClick={() => fileRef.current?.click()}
                  title="Attach photo or file"
                >
                  📎
                </button>
                <input
                  className="tf-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    chatClosed
                      ? "Interview chat closed"
                      : aiTyping
                        ? "typing…"
                        : app?.chatPhase === "awaiting_address"
                          ? "Enter your full home address…"
                          : app?.chatPhase === "onboarding"
                            ? "Ask about platform setup…"
                            : app?.chatPhase === "closing_offer" ||
                                app?.chatPhase === "closing_awaiting_question"
                              ? "Reply with your question, yes, or no…"
                              : "Type your answer…"
                  }
                  disabled={locked}
                />
                <button
                  className="tf-btn tf-btn-primary"
                  type="submit"
                  disabled={locked || (!input.trim() && !pendingFiles.length)}
                >
                  Send
                </button>
              </form>
            </div>
            {chatClosed ? (
              <p className="mt-2 text-xs text-[var(--muted)]">
                Interview chat closed — expect an email update on next steps
                {app?.approvalEmailSendAt
                  ? ` (approval email ~${new Date(app.approvalEmailSendAt).toLocaleString()})`
                  : ""}
                .
              </p>
            ) : null}
            {app?.chatPhase === "awaiting_ack" ? (
              <p className="mt-2 text-xs text-[var(--muted)]">
                Check your email for the approval message and acknowledgment link
                {app.approvalEmailSentAt ? " (sent)" : " (queued)"}.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
