"use client";

import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { AiTypingBubble } from "@/components/AiTypingBubble";
import { LiveChatBubble, type LiveChatAttachment, type LiveChatMsg } from "@/components/LiveChatBubble";
import { apiFetch } from "@/lib/auth-store";
import { clientTimezone, typingDelayMs, withApplicantChatTiming, withMinDelay } from "@/lib/typing-delay";

const LS_KEY = "tf_ai_dm_id";
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

export default function CareersBotChatPage() {
  const [id, setId] = useState("");
  const [chatPhase, setChatPhase] = useState("");
  const [messages, setMessages] = useState<LiveChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<LiveChatAttachment[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function openDm(existingId?: string) {
    setLoading(true);
    setError("");
    setAiTyping(false);
    setPendingFiles([]);
    try {
      const data = await apiFetch<{
        application: { id: string; chatPhase?: string };
        messages: LiveChatMsg[];
        chatLink?: string;
      }>("/api/careers", {
        method: "POST",
        body: JSON.stringify({
          action: "open-dm",
          id: existingId || undefined,
          fullName: "Guest Applicant",
          timezone: clientTimezone(),
        }),
      });
      setId(data.application.id);
      setChatPhase(data.application.chatPhase || "");
      try {
        localStorage.setItem(LS_KEY, data.application.id);
      } catch {
        /* ignore */
      }

      const msgs = data.messages || [];
      const isFresh =
        !existingId ||
        (msgs.filter((m) => m.role === "applicant").length === 0 &&
          msgs.some((m) => m.role === "assistant" || m.role === "system"));

      if (isFresh && msgs.length > 0) {
        setMessages([]);
        setLoading(false);
        setAiTyping(true);
        await withMinDelay(Promise.resolve(msgs), typingDelayMs());
        setMessages(msgs);
        setAiTyping(false);
      } else {
        setMessages(msgs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open chat");
      setAiTyping(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) || "" : "";
    openDm(saved || undefined);
  }, []);

  /** Poll for admin Q&A / address replies while the chat is open. */
  useEffect(() => {
    if (!id || loading) return;
    let cancelled = false;
    async function sync() {
      if (cancelled || sending || aiTyping) return;
      try {
        const data = await apiFetch<{
          messages: LiveChatMsg[];
          application?: { chatPhase?: string };
        }>(`/api/careers?id=${encodeURIComponent(id)}`);
        if (cancelled) return;
        const next = data.messages || [];
        setMessages((prev) => {
          if (next.length === prev.length && next[next.length - 1]?.id === prev[prev.length - 1]?.id) {
            return prev;
          }
          return next;
        });
        if (data.application?.chatPhase) setChatPhase(data.application.chatPhase);
      } catch {
        /* ignore poll errors */
      }
    }
    const t = setInterval(sync, 3000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [id, loading, sending, aiTyping]);

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
    const chatClosed = chatPhase === "awaiting_feedback";
    if (chatClosed || (!input.trim() && !pendingFiles.length) || !id || sending || aiTyping) return;
    const content = input.trim();
    const attachments = [...pendingFiles];
    const tempId = `local_${Date.now()}`;
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
        apiFetch<{ messages: LiveChatMsg[]; application?: { chatPhase?: string } }>("/api/careers", {
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
      // Refetch so admin replies pushed during the typing delay are not lost
      const latest = await apiFetch<{
        messages: LiveChatMsg[];
        application?: { chatPhase?: string };
      }>(`/api/careers?id=${encodeURIComponent(id)}`).catch(() => null);
      setMessages(latest?.messages || data.messages || []);
      if (latest?.application?.chatPhase || data.application?.chatPhase) {
        setChatPhase(latest?.application?.chatPhase || data.application?.chatPhase || "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(content);
      setPendingFiles(attachments);
    } finally {
      setAiTyping(false);
      setSending(false);
    }
  }

  const chatClosed = chatPhase === "awaiting_feedback";
  const locked = chatClosed || loading || !id || sending || aiTyping;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader solid variant="careers" />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--blue)]">Live chat</p>
            <h1 className="text-xl font-bold">TradeFlow interview AI</h1>
          </div>
          <button
            type="button"
            className="tf-btn tf-btn-ghost !min-h-9 text-xs"
            disabled={sending || aiTyping}
            onClick={() => {
              try {
                localStorage.removeItem(LS_KEY);
              } catch {
                /* ignore */
              }
              openDm();
            }}
          >
            New chat
          </button>
        </div>

        {error ? <p className="mb-2 text-sm text-[var(--red)]">{error}</p> : null}

        <div className="tf-card flex flex-1 flex-col overflow-hidden p-0">
          <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ minHeight: "55vh" }}>
            {loading ? (
              <p className="text-sm text-[var(--muted)]">Opening chat…</p>
            ) : (
              <>
                {messages.map((m, i) => (
                  <LiveChatBubble key={m.id || `${m.role}-${i}`} message={m} />
                ))}
                {aiTyping ? <AiTypingBubble /> : null}
              </>
            )}
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
                    : chatPhase === "closing_offer" || chatPhase === "closing_awaiting_question"
                      ? "Reply with your question, yes, or no…"
                      : "Message…"
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
            Interview chat closed — expect an email update on next steps.
          </p>
        ) : null}
      </div>
    </div>
  );
}
