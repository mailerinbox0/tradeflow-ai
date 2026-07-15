/**
 * Social auto-post campaign: 1000 realistic-looking testimonials
 * (withdrawal / trade / deposit / chat cards) posted on an admin hour interval.
 */
import { getStore, uid, type TelegramAccount, type TikTokAccount } from "@/lib/demo-store";
import { buildTestimonyMeta, renderTestimonyPng, type TestimonyMeta } from "@/lib/testimony-pack";

export type SocialPostResult = {
  platform: "telegram" | "tiktok";
  accountId: string;
  accountLabel: string;
  ok: boolean;
  status: "sent" | "queued" | "failed";
  detail: string;
  externalId?: string;
};

export type SocialPostLog = {
  id: string;
  activityId?: string;
  body: string;
  results: SocialPostResult[];
  createdAt: string;
};

export type TestimonyQueueItem = {
  id: string;
  index: number;
  kind: TestimonyMeta["kind"];
  caption: string;
  seedId: string;
  amountLabel: string;
  name: string;
  scheduledFor: string;
  status: "queued" | "sent" | "failed";
  detail?: string;
  meta: TestimonyMeta;
};

export type SocialCampaign = {
  enabled: boolean;
  platforms: ("telegram" | "tiktok")[];
  intervalHours: number;
  total: number;
  nextIndex: number;
  startedAt?: string;
  lastPostedAt?: string;
  queue: TestimonyQueueItem[];
};

function bag() {
  const g = globalThis as unknown as {
    __tfSocialLog?: SocialPostLog[];
    __tfTikTokQueue?: { id: string; accountId: string; caption: string; createdAt: string; status: string }[];
    __tfSocialCampaign?: SocialCampaign;
  };
  if (!g.__tfSocialLog) g.__tfSocialLog = [];
  if (!g.__tfTikTokQueue) g.__tfTikTokQueue = [];
  if (!g.__tfSocialCampaign) {
    g.__tfSocialCampaign = {
      enabled: false,
      platforms: ["telegram"],
      intervalHours: 1,
      total: 1000,
      nextIndex: 0,
      queue: [],
    };
  }
  return g;
}

export function getSocialPostLog() {
  return bag().__tfSocialLog!;
}

export function getTikTokQueue() {
  return bag().__tfTikTokQueue!;
}

export function getSocialCampaign() {
  return bag().__tfSocialCampaign!;
}

function telegramChatTarget(account: TelegramAccount) {
  if (account.channelId?.trim()) return account.channelId.trim();
  if (account.channelUsername?.trim()) return `@${account.channelUsername.trim().replace(/^@/, "")}`;
  return "";
}

export async function postToTelegramChannel(
  account: TelegramAccount,
  text: string,
  png?: Buffer,
): Promise<SocialPostResult> {
  const label = account.label || account.channelUsername || account.channelId || account.id;
  const chatId = telegramChatTarget(account);
  if (!account.botToken?.trim()) {
    return {
      platform: "telegram",
      accountId: account.id,
      accountLabel: label,
      ok: false,
      status: "failed",
      detail: "Missing bot token",
    };
  }
  if (!chatId) {
    return {
      platform: "telegram",
      accountId: account.id,
      accountLabel: label,
      ok: false,
      status: "failed",
      detail: "Missing channel ID or @username",
    };
  }

  const base =
    getStore().socialConfig.telegramApp?.apiBaseUrl?.replace(/\/$/, "") ||
    "https://api.telegram.org";

  try {
    if (png?.length) {
      const form = new FormData();
      form.append("chat_id", chatId);
      form.append("caption", text.slice(0, 1024));
      form.append("photo", new Blob([new Uint8Array(png)], { type: "image/png" }), "proof.png");
      const res = await fetch(`${base}/bot${account.botToken.trim()}/sendPhoto`, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(20000),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        description?: string;
        result?: { message_id?: number };
      };
      if (!res.ok || !data.ok) {
        return {
          platform: "telegram",
          accountId: account.id,
          accountLabel: label,
          ok: false,
          status: "failed",
          detail: data.description || `Telegram photo error (${res.status})`,
        };
      }
      return {
        platform: "telegram",
        accountId: account.id,
        accountLabel: label,
        ok: true,
        status: "sent",
        detail: "Photo + caption posted to Telegram channel",
        externalId: data.result?.message_id ? String(data.result.message_id) : undefined,
      };
    }

    const res = await fetch(`${base}/bot${account.botToken.trim()}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(12000),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      description?: string;
      result?: { message_id?: number };
    };
    if (!res.ok || !data.ok) {
      return {
        platform: "telegram",
        accountId: account.id,
        accountLabel: label,
        ok: false,
        status: "failed",
        detail: data.description || `Telegram API error (${res.status})`,
      };
    }
    return {
      platform: "telegram",
      accountId: account.id,
      accountLabel: label,
      ok: true,
      status: "sent",
      detail: "Posted to Telegram channel",
      externalId: data.result?.message_id ? String(data.result.message_id) : undefined,
    };
  } catch (err) {
    return {
      platform: "telegram",
      accountId: account.id,
      accountLabel: label,
      ok: false,
      status: "failed",
      detail: err instanceof Error ? err.message : "Telegram request failed",
    };
  }
}

export async function queueTikTokTestimony(
  account: TikTokAccount,
  text: string,
): Promise<SocialPostResult> {
  const label = account.label || account.username || account.id;
  if (!account.accessToken?.trim() || account.accessToken.startsWith("demo_tt_")) {
    return {
      platform: "tiktok",
      accountId: account.id,
      accountLabel: label,
      ok: false,
      status: "failed",
      detail: "Connect TikTok with a real OAuth access token first.",
    };
  }
  const q = bag().__tfTikTokQueue!;
  const row = {
    id: uid("ttq"),
    accountId: account.id,
    caption: text,
    createdAt: new Date().toISOString(),
    status: "queued_awaiting_video",
  };
  q.unshift(row);
  return {
    platform: "tiktok",
    accountId: account.id,
    accountLabel: label,
    ok: true,
    status: "queued",
    detail: "Caption queued for TikTok (video upload via Content Posting API).",
    externalId: row.id,
  };
}

export async function publishTestimony(opts: {
  body: string;
  activityId?: string;
  platforms?: ("telegram" | "tiktok")[];
  png?: Buffer;
}) {
  const text = opts.body.trim();
  if (!text) throw new Error("Post text required");
  const platforms = opts.platforms || ["telegram", "tiktok"];
  const store = getStore();
  const results: SocialPostResult[] = [];

  if (platforms.includes("telegram")) {
    const accounts = store.socialConfig.telegramAccounts.filter((a) => a.linked);
    if (!accounts.length) {
      results.push({
        platform: "telegram",
        accountId: "",
        accountLabel: "—",
        ok: false,
        status: "failed",
        detail: "No linked Telegram channels",
      });
    } else {
      for (const account of accounts) {
        results.push(await postToTelegramChannel(account, text, opts.png));
      }
    }
  }

  if (platforms.includes("tiktok")) {
    const accounts = store.socialConfig.tiktokAccounts.filter((a) => a.linked);
    if (!accounts.length) {
      results.push({
        platform: "tiktok",
        accountId: "",
        accountLabel: "—",
        ok: false,
        status: "failed",
        detail: "No linked TikTok accounts",
      });
    } else {
      for (const account of accounts) {
        results.push(await queueTikTokTestimony(account, text));
      }
    }
  }

  const log: SocialPostLog = {
    id: uid("spost"),
    activityId: opts.activityId,
    body: text,
    results,
    createdAt: new Date().toISOString(),
  };
  const logs = bag().__tfSocialLog!;
  logs.unshift(log);
  if (logs.length > 100) logs.length = 100;
  return log;
}

export function formatActivityTestimony(message: string) {
  return `${message}\n\nTradeFlow AI`;
}

/** Build full 1000-item schedule from platforms + hours between posts. */
export function startTestimonyCampaign(opts: {
  platforms: ("telegram" | "tiktok")[];
  intervalHours: number;
  count?: number;
}) {
  const platforms = opts.platforms.filter(Boolean);
  if (!platforms.length) throw new Error("Select at least one platform");
  const hours = Math.max(0.1, Number(opts.intervalHours) || 1);
  const count = Math.min(1000, Math.max(1, opts.count ?? 1000));
  const metas = buildTestimonyMeta(count);
  const now = Date.now();
  const intervalMs = hours * 60 * 60 * 1000;

  const queue: TestimonyQueueItem[] = metas.map((meta, index) => ({
    id: meta.id,
    index,
    kind: meta.kind,
    caption: meta.caption,
    seedId: meta.seedId,
    amountLabel: meta.amountLabel,
    name: meta.name,
    scheduledFor: new Date(now + index * intervalMs).toISOString(),
    status: "queued",
    meta,
  }));

  const campaign: SocialCampaign = {
    enabled: true,
    platforms,
    intervalHours: hours,
    total: queue.length,
    nextIndex: 0,
    startedAt: new Date().toISOString(),
    queue,
  };
  bag().__tfSocialCampaign = campaign;
  return {
    total: queue.length,
    intervalHours: hours,
    platforms,
    firstAt: queue[0]?.scheduledFor,
    lastAt: queue[queue.length - 1]?.scheduledFor,
  };
}

export function stopTestimonyCampaign() {
  const c = getSocialCampaign();
  c.enabled = false;
  return c;
}

/** Post any due queued testimonials (call on admin poll). */
export async function flushTestimonyCampaign(nowMs = Date.now()) {
  const c = getSocialCampaign();
  if (!c.enabled) return { posted: 0, remaining: c.queue.filter((q) => q.status === "queued").length };

  let posted = 0;
  for (const item of c.queue) {
    if (item.status !== "queued") continue;
    if (new Date(item.scheduledFor).getTime() > nowMs) continue;

    const png = renderTestimonyPng({
      kind: item.meta.kind,
      title: item.meta.title,
      amount: item.meta.amountLabel,
      subtitle: item.meta.subtitle,
      meta: item.meta.footer,
    });

    const log = await publishTestimony({
      body: item.caption,
      activityId: item.seedId,
      platforms: c.platforms,
      png,
    });

    const failed = log.results.every((r) => r.status === "failed");
    item.status = failed ? "failed" : "sent";
    item.detail = log.results.map((r) => `${r.platform}:${r.status}`).join(", ");
    c.lastPostedAt = new Date().toISOString();
    c.nextIndex = Math.max(c.nextIndex, item.index + 1);
    posted += 1;

    // Don't flood Telegram API — max one photo post per flush tick unless interval is tiny
    if (c.intervalHours >= 0.05) break;
  }

  const remaining = c.queue.filter((q) => q.status === "queued").length;
  if (remaining === 0) c.enabled = false;
  return { posted, remaining };
}

export function campaignSnapshot() {
  const c = getSocialCampaign();
  const queued = c.queue.filter((q) => q.status === "queued").length;
  const sent = c.queue.filter((q) => q.status === "sent").length;
  const failed = c.queue.filter((q) => q.status === "failed").length;
  const next = c.queue.find((q) => q.status === "queued");
  return {
    enabled: c.enabled,
    platforms: c.platforms,
    intervalHours: c.intervalHours,
    total: c.total,
    queued,
    sent,
    failed,
    startedAt: c.startedAt,
    lastPostedAt: c.lastPostedAt,
    nextAt: next?.scheduledFor,
    nextPreview: next
      ? { id: next.id, kind: next.kind, caption: next.caption.slice(0, 120), name: next.name }
      : null,
    recent: c.queue
      .filter((q) => q.status !== "queued")
      .slice(-8)
      .reverse()
      .map((q) => ({
        id: q.id,
        kind: q.kind,
        status: q.status,
        scheduledFor: q.scheduledFor,
        detail: q.detail,
        caption: q.caption.slice(0, 100),
      })),
  };
}
