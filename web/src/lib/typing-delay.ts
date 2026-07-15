/** One tick stays ~2s; double (delivered) ticks appear on the 3rd second. */
export const CHAT_DOUBLE_TICK_MS = 3_000;

/** Blue (seen) ticks appear at 5s total — 2s after double ticks. */
export const CHAT_BLUE_TICK_MS = 5_000;

/** After blue ticks, typing shows for 4 seconds before the reply. */
export function typingAfterSeenMs() {
  return 4_000;
}

/** Min wait before opening-chat replies (blue-tick moment). */
export function typingDelayMs() {
  return CHAT_BLUE_TICK_MS + typingAfterSeenMs();
}

export function clientTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

export function waitMs(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Run work and guarantee at least `ms` elapsed before resolving. */
export async function withMinDelay<T>(work: Promise<T>, ms: number): Promise<T> {
  const [result] = await Promise.all([work, waitMs(ms)]);
  return result;
}

/**
 * Applicant send UX:
 * 0s → one tick (sent)
 * 3s → two gray ticks (delivered)
 * 5s → blue ticks (seen) + typing starts
 * 5s + 4s → reply appears
 */
export async function withApplicantChatTiming<T>(
  work: Promise<T>,
  opts: {
    onDoubleTick: () => void;
    onBlueTick: () => void;
    onTypingStart: () => void;
  },
): Promise<T> {
  const typingMs = typingAfterSeenMs();
  const revealAt = CHAT_BLUE_TICK_MS + typingMs;

  void waitMs(CHAT_DOUBLE_TICK_MS).then(() => {
    opts.onDoubleTick();
  });
  void waitMs(CHAT_BLUE_TICK_MS).then(() => {
    opts.onBlueTick();
    opts.onTypingStart();
  });

  const [result] = await Promise.all([work, waitMs(revealAt)]);
  return result;
}
