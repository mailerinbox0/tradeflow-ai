"use client";

export function AiTypingBubble() {
  return (
    <div
      className="inline-flex max-w-[90%] items-center gap-1.5 rounded-2xl bg-[rgba(47,123,255,0.15)] px-4 py-3"
      aria-live="polite"
      aria-label="typing"
    >
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--blue)] [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--blue)] [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--blue)] [animation-delay:300ms]" />
      <span className="ml-1 text-xs text-[var(--muted)]">typing…</span>
    </div>
  );
}
