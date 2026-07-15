"use client";

export type LiveChatAttachment = {
  id?: string;
  name: string;
  mime: string;
  size?: number;
  dataUrl: string;
};

export type LiveChatMsg = {
  id?: string;
  role: string;
  content: string;
  createdAt?: string;
  status?: "sent" | "delivered" | "seen";
  attachments?: LiveChatAttachment[];
};

function formatTime(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function Ticks({ status }: { status?: string }) {
  if (!status) return null;
  const seen = status === "seen";
  const color = seen ? "#53bdeb" : "rgba(255,255,255,0.55)";
  if (status === "sent") {
    return (
      <svg width="14" height="10" viewBox="0 0 14 10" aria-label="Sent" className="inline-block">
        <path
          d="M1.5 5.2 L3.8 7.5 L8.8 1.8"
          fill="none"
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="18" height="10" viewBox="0 0 18 10" aria-label={seen ? "Seen" : "Delivered"}>
      <path
        d="M1 5.2 L3.3 7.5 L8.3 1.8"
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.2 5.2 L7.5 7.5 L12.5 1.8"
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LiveChatBubble({ message }: { message: LiveChatMsg }) {
  const mine = message.role === "applicant";
  const attachments = message.attachments || [];

  return (
    <div className={`flex max-w-[88%] flex-col gap-1 ${mine ? "ml-auto items-end" : "items-start"}`}>
      <div
        className={`rounded-2xl px-3 py-2 text-sm shadow-sm ${
          mine
            ? "rounded-br-md bg-[rgba(34,197,94,0.22)]"
            : "rounded-bl-md bg-[rgba(47,123,255,0.18)]"
        }`}
      >
        {attachments.length > 0 ? (
          <div className="mb-2 space-y-2">
            {attachments.map((a, i) =>
              a.mime.startsWith("image/") && a.dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={a.id || `${a.name}-${i}`}
                  src={a.dataUrl}
                  alt={a.name}
                  className="max-h-56 max-w-full rounded-lg border border-white/10 object-contain"
                />
              ) : (
                <a
                  key={a.id || `${a.name}-${i}`}
                  href={a.dataUrl}
                  download={a.name}
                  className="flex items-center gap-2 rounded-lg bg-black/25 px-3 py-2 text-xs text-[var(--blue)] underline"
                >
                  <span aria-hidden>📎</span>
                  <span className="truncate">{a.name}</span>
                </a>
              ),
            )}
          </div>
        ) : null}
        {message.content ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : null}
        <div
          className={`mt-1 flex items-center gap-1 text-[10px] ${
            mine ? "justify-end text-white/50" : "justify-start text-[var(--muted)]"
          }`}
        >
          <span>{formatTime(message.createdAt)}</span>
          {mine ? <Ticks status={message.status || "sent"} /> : null}
        </div>
      </div>
    </div>
  );
}
