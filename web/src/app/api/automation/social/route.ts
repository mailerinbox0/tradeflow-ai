/**
 * Social automation — posts ONLY real activity_feed items.
 * Telegram: live Bot API. TikTok: caption queue (video API requires approved OAuth app).
 */
import { json } from "@/lib/api";
import { SOCIAL_INTERVAL_MINUTES } from "@/lib/constants";
import { getStore, uid } from "@/lib/demo-store";
import {
  formatActivityTestimony,
  getSocialPostLog,
  getTikTokQueue,
  publishTestimony,
} from "@/lib/social-post";

type QueueItem = {
  id: string;
  channel: "telegram" | "tiktok";
  body: string;
  scheduledFor: string;
  status: "queued" | "sent" | "failed";
  activityId: string;
  detail?: string;
};

function getQueue() {
  const g = globalThis as unknown as { __tfSocial?: QueueItem[] };
  if (!g.__tfSocial) g.__tfSocial = [];
  return g.__tfSocial;
}

function pickInterval() {
  const arr = SOCIAL_INTERVAL_MINUTES;
  return arr[Math.floor(Math.random() * arr.length)] * 60 * 1000;
}

export async function GET() {
  return json({
    policy: "Only real platform activity is scheduled. No fabricated social proof.",
    intervalsMinutes: SOCIAL_INTERVAL_MINUTES,
    queue: getQueue().slice(0, 30),
    tiktokCaptionQueue: getTikTokQueue().slice(0, 20),
    recentPosts: getSocialPostLog().slice(0, 20),
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "tick");

  if (action === "schedule-day") {
    const activities = getStore().activities.filter((a) =>
      ["withdrawal", "trade", "funding", "cashout", "deposit"].includes(a.kind),
    );
    const queue = getQueue();
    queue.length = 0;
    let cursor = Date.now() + pickInterval();
    const end = Date.now() + 24 * 60 * 60 * 1000;
    let i = 0;
    while (cursor < end && activities.length) {
      const act = activities[i % activities.length];
      for (const channel of ["telegram", "tiktok"] as const) {
        queue.push({
          id: uid("soc"),
          channel,
          body: formatActivityTestimony(act.message),
          scheduledFor: new Date(cursor).toISOString(),
          status: "queued",
          activityId: act.id,
        });
      }
      cursor += pickInterval();
      i += 1;
    }
    return json({ ok: true, scheduled: queue.length, next: queue[0] });
  }

  if (action === "tick") {
    const now = Date.now();
    const due = getQueue().filter((q) => q.status === "queued" && new Date(q.scheduledFor).getTime() <= now);
    let sent = 0;
    for (const item of due) {
      const log = await publishTestimony({
        body: item.body,
        activityId: item.activityId,
        platforms: [item.channel],
      });
      const result = log.results[0];
      if (result?.status === "sent" || result?.status === "queued") {
        item.status = "sent";
        item.detail = result.detail;
        sent += 1;
      } else {
        item.status = "failed";
        item.detail = result?.detail || "Failed";
      }
    }
    return json({
      ok: true,
      sent,
      remaining: getQueue().filter((q) => q.status === "queued").length,
    });
  }

  if (action === "publish-now") {
    const text = String(body.body || "").trim();
    const activityId = body.activityId ? String(body.activityId) : undefined;
    let message = text;
    if (!message && activityId) {
      const act = getStore().activities.find((a) => a.id === activityId);
      if (!act) return json({ error: "Activity not found" }, 404);
      message = formatActivityTestimony(act.message);
    }
    if (!message) return json({ error: "Post body or activityId required" }, 400);
    const platforms = Array.isArray(body.platforms)
      ? (body.platforms as ("telegram" | "tiktok")[])
      : (["telegram", "tiktok"] as const);
    const log = await publishTestimony({
      body: message,
      activityId,
      platforms: [...platforms],
    });
    return json({ ok: true, post: log });
  }

  return json({ error: "Unknown action" }, 400);
}
