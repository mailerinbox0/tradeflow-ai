import { error, json, requireAdmin } from "@/lib/api";
import { DEPOSIT_ASSETS } from "@/lib/constants";
import {
  flushDueEmails,
  getStore,
  processRecruitmentBot,
  dismissAdminQa,
  replyAdminQa,
  sendAddressNotify,
  startAdminMailThread,
  replyAdminMailThread,
  markMailThreadRead,
  setMailThreadStatus,
  listMailMessagesForThread,
  scheduleWithdrawalAutoEmail,
  uid,
} from "@/lib/demo-store";
import { formatActivityTestimony, getSocialPostLog, getTikTokQueue, publishTestimony, campaignSnapshot, flushTestimonyCampaign, startTestimonyCampaign, stopTestimonyCampaign } from "@/lib/social-post";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { res } = requireAdmin(req);
  if (res) return res;
  const newlySent = flushDueEmails();
  const recruitFlushed = processRecruitmentBot();
  const testimonyFlush = await flushTestimonyCampaign();
  const s = getStore();
  return json({
    users: s.users.map(({ password: _p, ...u }) => u),
    deposits: s.deposits,
    withdrawals: s.withdrawals,
    trades: s.trades,
    leads: s.leads,
    applications: s.applications,
    activities: s.activities.slice(0, 50),
    withdrawalAutoMessage: s.withdrawalAutoMessage,
    emailOutbox: s.emailOutbox.slice(0, 40),
    newlySentCount: newlySent.length,
    recruitBotFlushed: recruitFlushed.length,
    testimonyPosted: testimonyFlush.posted,
    wallets: s.wallets,
    depositAssets: DEPOSIT_ASSETS,
    socialConfig: {
      telegramApp: s.socialConfig.telegramApp || {
        defaultBotToken: "",
        defaultBotUsername: "",
        apiBaseUrl: "https://api.telegram.org",
      },
      tiktokApp: s.socialConfig.tiktokApp || {
        clientKey: "",
        clientSecret: "",
        redirectUri: "http://localhost:3000/api/oauth/tiktok/callback",
        scopes: "user.info.basic video.upload video.publish",
        authUrl: "https://www.tiktok.com/v2/auth/authorize/",
        tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
      },
      telegramAccounts: s.socialConfig.telegramAccounts || [],
      tiktokAccounts: s.socialConfig.tiktokAccounts || [],
    },
    socialPostLog: getSocialPostLog().slice(0, 25),
    tiktokCaptionQueue: getTikTokQueue().slice(0, 20),
    socialCampaign: campaignSnapshot(),
    testimonyActivities: s.activities
      .filter((a) => ["withdrawal", "trade", "funding", "cashout", "deposit"].includes(a.kind))
      .slice(0, 30),
    aiRecruitment: s.aiRecruitment,
    recruitBotOutbox: s.recruitBotOutbox.slice(0, 50),
    hiringAlerts: s.hiringAlerts.slice(0, 40),
    adminQa: s.adminQa.slice(0, 80),
    adminAddresses: s.adminAddresses.slice(0, 80),
    addressNotify: s.addressNotify,
    adminMailThreads: s.adminMailThreads.slice(0, 100),
    adminMailMessages: s.adminMailMessages.slice(0, 400),
    knowledgeBase: s.knowledgeBase,
    conversationMemory: s.conversationMemory.slice(0, 80),
    leadCampaign: s.leadCampaign,
    stats: {
      totalUsers: s.users.filter((u) => u.role === "user").length,
      totalDeposits: s.deposits.reduce((a, d) => a + (d.status === "confirmed" ? d.amountUsd : 0), 0),
      pendingDeposits: s.deposits.filter((d) => d.status !== "confirmed").length,
      pendingWithdrawals: s.withdrawals.filter((w) => w.status === "pending" || w.status === "processing").length,
      activeTrades: s.trades.filter((t) => t.status === "active").length,
      openApplications: s.applications.filter((a) => !["approved"].includes(a.status)).length,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const { res } = requireAdmin(req);
  if (res) return res;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");

  if (action === "set-user-status") {
    const user = getStore().users.find((u) => u.id === body.userId);
    if (!user) return error("User not found", 404);
    if (!["active", "suspended", "restricted"].includes(body.status)) return error("Bad status");
    user.status = body.status;
    return json({ ok: true, user: { id: user.id, status: user.status } });
  }

  if (action === "delete-user") {
    const idx = getStore().users.findIndex((u) => u.id === body.userId && u.role !== "admin");
    if (idx < 0) return error("User not found", 404);
    getStore().users.splice(idx, 1);
    return json({ ok: true });
  }

  if (action === "complete-withdrawal") {
    const w = getStore().withdrawals.find((x) => x.id === body.id);
    if (!w) return error("Not found", 404);
    w.status = "completed";
    w.completedAt = new Date().toISOString();
    const u = getStore().users.find((x) => x.id === w.userId);
    if (u) u.totalWithdrawals = Number((u.totalWithdrawals + w.amountUsd).toFixed(2));
    getStore().activities.unshift({
      id: uid("act"),
      kind: "cashout",
      message: `${u?.fullName.split(" ")[0] || "User"} withdrawal completed $${w.amountUsd}`,
      amountUsd: w.amountUsd,
      createdAt: new Date().toISOString(),
    });
    const queued = scheduleWithdrawalAutoEmail(w);
    return json({
      ok: true,
      withdrawal: w,
      followupEmail: queued
        ? { to: queued.to, sendAt: queued.sendAt, status: queued.status }
        : null,
      message: queued
        ? `Withdrawal completed. Auto email queued for ${queued.to} at ${new Date(queued.sendAt).toLocaleString()}`
        : "Withdrawal completed",
    });
  }

  if (action === "save-lead-campaign") {
    const settings = getStore().leadCampaign;
    if (typeof body.enabled === "boolean") settings.enabled = body.enabled;
    if (typeof body.subject === "string") settings.subject = body.subject.slice(0, 200);
    if (typeof body.message === "string") settings.message = body.message.slice(0, 5000);
    return json({ ok: true, leadCampaign: settings, message: "Lead campaign message saved" });
  }

  if (action === "delete-leads") {
    const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
    if (!ids.length) return error("Select at least one lead");
    const set = new Set(ids);
    const before = getStore().leads.length;
    getStore().leads = getStore().leads.filter((l) => !set.has(l.id));
    const removed = before - getStore().leads.length;
    return json({ ok: true, removed, leads: getStore().leads, message: `Deleted ${removed} lead(s)` });
  }

  if (action === "mark-leads-exported") {
    const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
    if (!ids.length) return error("No leads to mark exported");
    const set = new Set(ids);
    const now = new Date().toISOString();
    let marked = 0;
    for (const lead of getStore().leads) {
      if (!set.has(lead.id)) continue;
      lead.exportedAt = now;
      marked += 1;
    }
    return json({
      ok: true,
      marked,
      leads: getStore().leads,
      message: `Marked ${marked} lead(s) as exported`,
    });
  }

  if (action === "save-withdrawal-auto-message") {
    const settings = getStore().withdrawalAutoMessage;
    if (typeof body.enabled === "boolean") settings.enabled = body.enabled;
    if (typeof body.delayMinutes === "number" && body.delayMinutes >= 1) {
      settings.delayMinutes = Math.min(1440, Math.floor(body.delayMinutes));
    }
    if (typeof body.subject === "string") settings.subject = body.subject.slice(0, 200);
    if (typeof body.message === "string") settings.message = body.message.slice(0, 5000);
    if (Array.isArray(body.eligibleUserIds)) {
      const ids = body.eligibleUserIds.map(String);
      const valid = new Set(getStore().users.filter((u) => u.role === "user").map((u) => u.id));
      settings.eligibleUserIds = ids.filter((id: string) => valid.has(id));
    }
    return json({ ok: true, withdrawalAutoMessage: settings, message: "Auto withdrawal message saved" });
  }

  if (action === "upsert-wallet") {
    const asset = String(body.asset || "").toUpperCase();
    const network = String(body.network || "");
    const address = String(body.address || "").trim();
    const label = typeof body.label === "string" ? body.label.trim() : "";
    const enabled = body.enabled !== false;
    const conf = DEPOSIT_ASSETS.find((a) => a.symbol === asset);
    if (!conf) return error("Unsupported asset");
    if (!conf.networks.includes(network as never)) return error("Unsupported network for asset");
    if (!address || address.length < 8) return error("Enter a valid wallet address");

    const now = new Date().toISOString();
    const existing = body.id
      ? getStore().wallets.find((w) => w.id === body.id)
      : getStore().wallets.find((w) => w.asset === asset && w.network === network);

    if (existing) {
      existing.asset = asset;
      existing.network = network;
      existing.address = address;
      existing.label = label || existing.label;
      existing.enabled = enabled;
      existing.updatedAt = now;
      return json({ ok: true, wallet: existing, message: "Wallet updated" });
    }

    const wallet = {
      id: uid("wal"),
      asset,
      network,
      address,
      label: label || `${asset} ${network}`,
      enabled,
      createdAt: now,
      updatedAt: now,
    };
    getStore().wallets.unshift(wallet);
    return json({ ok: true, wallet, message: "Wallet added" });
  }

  if (action === "delete-wallet") {
    const idx = getStore().wallets.findIndex((w) => w.id === body.id);
    if (idx < 0) return error("Wallet not found", 404);
    getStore().wallets.splice(idx, 1);
    return json({ ok: true, message: "Wallet removed" });
  }

  if (action === "toggle-wallet") {
    const w = getStore().wallets.find((x) => x.id === body.id);
    if (!w) return error("Wallet not found", 404);
    w.enabled = !w.enabled;
    w.updatedAt = new Date().toISOString();
    return json({ ok: true, wallet: w, message: w.enabled ? "Wallet enabled" : "Wallet disabled" });
  }

  if (action === "confirm-deposit") {
    const d = getStore().deposits.find((x) => x.id === body.id);
    if (!d) return error("Not found", 404);
    if (d.status !== "confirmed") {
      d.status = "confirmed";
      const u = getStore().users.find((x) => x.id === d.userId);
      if (u) {
        u.balanceUsd = Number((u.balanceUsd + d.amountUsd).toFixed(2));
        u.totalDeposits = Number((u.totalDeposits + d.amountUsd).toFixed(2));
      }
    }
    return json({ ok: true, deposit: d });
  }

  if (action === "approve-application") {
    const app = getStore().applications.find((a) => a.id === body.id);
    if (!app) return error("Not found", 404);
    app.status = "approved";
    const tempPass = `TF${Math.random().toString(36).slice(2, 10)}!`;
    const emp = {
      id: uid("emp"),
      fullName: app.fullName,
      email: app.email.toLowerCase(),
      country: app.country,
      phone: app.phone,
      role: "employee" as const,
      password: tempPass,
      balanceUsd: 0,
      totalProfit: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      forcePasswordChange: true,
      status: "active" as const,
      referralCode: `EM${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      createdAt: new Date().toISOString(),
    };
    if (!getStore().users.some((u) => u.email === emp.email)) getStore().users.push(emp);
    return json({
      ok: true,
      credentials: { email: emp.email, temporaryPassword: tempPass },
      message: "Employee account created — force password change on first login",
    });
  }

  if (action === "save-telegram-app") {
    const app = getStore().socialConfig.telegramApp;
    if (typeof body.defaultBotToken === "string") app.defaultBotToken = body.defaultBotToken.trim();
    if (typeof body.defaultBotUsername === "string") {
      app.defaultBotUsername = body.defaultBotUsername.trim().replace(/^@/, "");
    }
    if (typeof body.apiBaseUrl === "string" && body.apiBaseUrl.trim()) {
      app.apiBaseUrl = body.apiBaseUrl.trim().replace(/\/$/, "");
    }
    return json({ ok: true, socialConfig: getStore().socialConfig, message: "Telegram app settings saved" });
  }

  if (action === "save-tiktok-app") {
    const app = getStore().socialConfig.tiktokApp;
    if (typeof body.clientKey === "string") app.clientKey = body.clientKey.trim();
    if (typeof body.clientSecret === "string") app.clientSecret = body.clientSecret.trim();
    if (typeof body.redirectUri === "string") app.redirectUri = body.redirectUri.trim();
    if (typeof body.scopes === "string") app.scopes = body.scopes.trim();
    if (typeof body.authUrl === "string" && body.authUrl.trim()) app.authUrl = body.authUrl.trim();
    if (typeof body.tokenUrl === "string" && body.tokenUrl.trim()) app.tokenUrl = body.tokenUrl.trim();
    return json({ ok: true, socialConfig: getStore().socialConfig, message: "TikTok app settings saved" });
  }

  if (action === "add-telegram-account") {
    const defaults = getStore().socialConfig.telegramApp;
    const botUsername = String(body.botUsername || defaults.defaultBotUsername || "")
      .trim()
      .replace(/^@/, "");
    const botToken = String(body.botToken || defaults.defaultBotToken || "").trim();
    const channelId = String(body.channelId || "").trim();
    const channelUsername = String(body.channelUsername || "").trim().replace(/^@/, "");
    const label =
      String(body.label || "").trim() ||
      (channelUsername ? `@${channelUsername}` : botUsername ? `@${botUsername}` : "Telegram channel");
    if (!botToken) return error("Bot token is required (set Default bot token above or fill this form)");
    if (!channelId && !channelUsername) {
      return error("Enter a Telegram channel ID (-100…) or channel username (@name)");
    }
    if (channelId && !/^-?\d+$/.test(channelId)) {
      return error("Channel ID must be numeric (channels usually start with -100)");
    }
    const row = {
      id: uid("tg"),
      label,
      botUsername,
      botToken,
      channelId: channelId || (channelUsername ? `@${channelUsername}` : ""),
      channelUsername,
      linked: true,
      linkedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    getStore().socialConfig.telegramAccounts.unshift(row);
    return json({
      ok: true,
      socialConfig: getStore().socialConfig,
      message: `Telegram channel linked: ${label}`,
    });
  }

  if (action === "add-tiktok-account") {
    const username = String(body.username || "").trim().replace(/^@/, "");
    const accessToken = String(body.accessToken || "").trim();
    const refreshToken = String(body.refreshToken || "").trim();
    const openId = String(body.openId || "").trim();
    const label = String(body.label || "").trim() || (username ? `@${username}` : "TikTok");
    if (!username) return error("TikTok username is required");
    if (!accessToken || accessToken.startsWith("demo_tt_")) {
      return error("Paste a TikTok access token (from OAuth). Complete TikTok app settings above first.");
    }
    const row = {
      id: uid("tt"),
      label,
      username,
      accessToken,
      refreshToken,
      openId,
      tokenExpiresAt: body.tokenExpiresAt ? String(body.tokenExpiresAt) : undefined,
      linked: true,
      linkedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    getStore().socialConfig.tiktokAccounts.unshift(row);
    return json({
      ok: true,
      socialConfig: getStore().socialConfig,
      message: `TikTok connected: @${username}`,
    });
  }

  if (action === "remove-social-account") {
    const platform = String(body.platform || "");
    const id = String(body.id || "");
    const cfg = getStore().socialConfig;
    if (platform === "telegram") {
      const idx = cfg.telegramAccounts.findIndex((a) => a.id === id);
      if (idx < 0) return error("Telegram account not found", 404);
      cfg.telegramAccounts.splice(idx, 1);
      return json({ ok: true, socialConfig: cfg, message: "Telegram account removed" });
    }
    if (platform === "tiktok") {
      const idx = cfg.tiktokAccounts.findIndex((a) => a.id === id);
      if (idx < 0) return error("TikTok account not found", 404);
      cfg.tiktokAccounts.splice(idx, 1);
      return json({ ok: true, socialConfig: cfg, message: "TikTok account removed" });
    }
    return error("platform must be telegram or tiktok");
  }

  if (action === "toggle-social-account") {
    const platform = String(body.platform || "");
    const id = String(body.id || "");
    const cfg = getStore().socialConfig;
    const list = platform === "telegram" ? cfg.telegramAccounts : platform === "tiktok" ? cfg.tiktokAccounts : null;
    if (!list) return error("platform must be telegram or tiktok");
    const row = list.find((a) => a.id === id);
    if (!row) return error("Account not found", 404);
    row.linked = !row.linked;
    row.linkedAt = row.linked ? new Date().toISOString() : undefined;
    return json({
      ok: true,
      socialConfig: cfg,
      message: row.linked ? "Account enabled" : "Account disabled",
    });
  }

  if (action === "publish-testimony") {
    const activityId = body.activityId ? String(body.activityId) : undefined;
    let message = String(body.body || "").trim();
    if (!message && activityId) {
      const act = getStore().activities.find((a) => a.id === activityId);
      if (!act) return error("Activity not found", 404);
      message = formatActivityTestimony(act.message);
    }
    if (!message) return error("Enter post text or pick an activity");
    const platforms = Array.isArray(body.platforms)
      ? (body.platforms.map(String) as ("telegram" | "tiktok")[])
      : (["telegram", "tiktok"] as ("telegram" | "tiktok")[]);
    const post = await publishTestimony({ body: message, activityId, platforms });
    const sentTg = post.results.filter((r) => r.platform === "telegram" && r.status === "sent").length;
    const queuedTt = post.results.filter((r) => r.platform === "tiktok" && r.status === "queued").length;
    const failed = post.results.filter((r) => r.status === "failed").length;
    return json({
      ok: true,
      post,
      message: `Published: ${sentTg} Telegram sent, ${queuedTt} TikTok queued, ${failed} failed`,
    });
  }

  if (action === "start-testimony-campaign") {
    const platforms = Array.isArray(body.platforms)
      ? (body.platforms
          .map((p: unknown) => String(p))
          .filter((p: string) => p === "telegram" || p === "tiktok") as ("telegram" | "tiktok")[])
      : ([] as ("telegram" | "tiktok")[]);
    if (!platforms.length) return error("Select Telegram and/or TikTok");
    const intervalHours = Number(body.intervalHours);
    if (!Number.isFinite(intervalHours) || intervalHours <= 0) {
      return error("Interval hours must be greater than 0");
    }
    const count = body.count != null ? Number(body.count) : 1000;
    try {
      const started = startTestimonyCampaign({
        platforms,
        intervalHours,
        count: Number.isFinite(count) ? count : 1000,
      });
      // Post first due item immediately if scheduled for now
      const flush = await flushTestimonyCampaign();
      return json({
        ok: true,
        campaign: campaignSnapshot(),
        started,
        flush,
        message: `Queued ${started.total} testimonials every ${started.intervalHours}h to ${started.platforms.join(" + ")}`,
      });
    } catch (e) {
      return error(e instanceof Error ? e.message : "Failed to start campaign");
    }
  }

  if (action === "stop-testimony-campaign") {
    stopTestimonyCampaign();
    return json({ ok: true, campaign: campaignSnapshot(), message: "Campaign paused" });
  }

  if (action === "flush-testimony-campaign") {
    const flush = await flushTestimonyCampaign();
    return json({ ok: true, flush, campaign: campaignSnapshot(), message: `Posted ${flush.posted}` });
  }

  if (action === "reply-qa") {
    const id = String(body.id || "").trim();
    const reply = String(body.reply || body.content || "").trim();
    const result = replyAdminQa(id, reply);
    if (!result.ok) return error(result.error, 400);
    return json({ ok: true, item: result.item, message: "Reply sent to applicant chat" });
  }

  if (action === "dismiss-qa") {
    const id = String(body.id || "").trim();
    const result = dismissAdminQa(id);
    if (!result.ok) return error(result.error, 400);
    return json({ ok: true, item: result.item, message: "Question dismissed" });
  }

  if (action === "save-address-notify") {
    const cfg = getStore().addressNotify;
    if (typeof body.message === "string") {
      cfg.message = body.message.slice(0, 8000);
    }
    return json({ ok: true, addressNotify: cfg, message: "Address message saved" });
  }

  if (action === "send-address-message") {
    const id = String(body.id || "").trim();
    const result = sendAddressNotify(id);
    if (!result.ok) return error(result.error, 400);
    return json({ ok: true, item: result.item, message: "Custom message sent to applicant chat" });
  }

  if (action === "start-mail-thread") {
    const applicationId = String(body.applicationId || body.id || "").trim();
    const subject = String(body.subject || "").trim();
    const message = String(body.body || body.message || "").trim();
    const result = startAdminMailThread({ applicationId, subject, body: message });
    if (!result.ok) return error(result.error, 400);
    return json({
      ok: true,
      thread: result.thread,
      message: "Email sent to applicant (demo mailbox)",
      mailboxLink: `/careers/mailbox/${result.thread.applicationId}`,
    });
  }

  if (action === "reply-mail-thread") {
    const threadId = String(body.threadId || body.id || "").trim();
    const message = String(body.body || body.message || "").trim();
    const result = replyAdminMailThread(threadId, message);
    if (!result.ok) return error(result.error, 400);
    return json({ ok: true, thread: result.thread, message: "Reply emailed to applicant" });
  }

  if (action === "read-mail-thread") {
    const threadId = String(body.threadId || body.id || "").trim();
    const result = markMailThreadRead(threadId);
    if (!result.ok) return error(result.error, 400);
    return json({
      ok: true,
      thread: result.thread,
      messages: listMailMessagesForThread(threadId),
    });
  }

  if (action === "close-mail-thread" || action === "open-mail-thread") {
    const threadId = String(body.threadId || body.id || "").trim();
    const result = setMailThreadStatus(threadId, action === "close-mail-thread" ? "closed" : "open");
    if (!result.ok) return error(result.error, 400);
    return json({ ok: true, thread: result.thread, message: `Thread ${result.thread.status}` });
  }

  if (action === "save-ai-recruitment") {
    const cfg = getStore().aiRecruitment;
    if (typeof body.confirmMessage === "string") cfg.confirmMessage = body.confirmMessage.slice(0, 4000);
    if (typeof body.reminderMessage === "string") cfg.reminderMessage = body.reminderMessage.slice(0, 4000);
    if (typeof body.readyMessage === "string") cfg.readyMessage = body.readyMessage.slice(0, 4000);
    if (Array.isArray(body.questions)) {
      cfg.questions = body.questions.map((q: unknown) => String(q).trim()).filter(Boolean).slice(0, 30);
    }
    if (typeof body.replyAfterApplyMinutes === "number" && body.replyAfterApplyMinutes >= 0) {
      cfg.replyAfterApplyMinutes = Math.min(1440, Math.floor(body.replyAfterApplyMinutes));
    }
    if (typeof body.interviewAfterApplyMinutes === "number" && body.interviewAfterApplyMinutes >= 1) {
      cfg.interviewAfterApplyMinutes = Math.min(24 * 60, Math.floor(body.interviewAfterApplyMinutes));
    }
    if (typeof body.rescheduleHours === "number" && body.rescheduleHours > 0) {
      cfg.rescheduleHours = Math.min(168, Number(body.rescheduleHours));
    }
    if (typeof body.reminderBeforeInterviewMinutes === "number" && body.reminderBeforeInterviewMinutes >= 0) {
      cfg.reminderBeforeInterviewMinutes = Math.min(24 * 60, Math.floor(body.reminderBeforeInterviewMinutes));
    }
    return json({ ok: true, aiRecruitment: cfg, message: "Interview bot settings saved" });
  }

  return error("Unknown action");
}
