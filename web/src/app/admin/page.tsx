"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminShell, type AdminSection } from "@/components/AdminShell";
import { apiFetch, useAuth } from "@/lib/auth-store";
import { formatUsd } from "@/lib/utils";

type AutoMsg = {
  enabled: boolean;
  delayMinutes: number;
  subject: string;
  message: string;
  eligibleUserIds: string[];
};

type OutboxMail = {
  id: string;
  to: string;
  subject: string;
  body: string;
  sendAt: string;
  status: string;
  sentAt?: string;
  withdrawalId: string;
};

type WalletRow = {
  id: string;
  asset: string;
  network: string;
  address: string;
  label?: string;
  enabled: boolean;
};

type AdminData = {
  stats: {
    totalUsers: number;
    totalDeposits: number;
    pendingDeposits: number;
    pendingWithdrawals: number;
    activeTrades: number;
    openApplications?: number;
  };
  users: { id: string; email: string; fullName: string; status: string; balanceUsd: number; role: string }[];
  deposits: { id: string; amountUsd: number; status: string; asset: string }[];
  withdrawals: { id: string; amountUsd: number; status: string; asset: string }[];
  leads: {
    id: string;
    email: string;
    name?: string;
    campaignStatus: string;
    source?: string;
    lastError?: string;
    sentAt?: string;
    exportedAt?: string;
    createdAt: string;
  }[];
  leadCampaign?: { enabled: boolean; subject: string; message: string };
  applications: {
    id: string;
    fullName: string;
    email: string;
    status: string;
    roleApplied?: string;
    interviewAt?: string;
    missedCount?: number;
    chatPhase?: string;
    shippingAddress?: string;
    resumeText?: string;
    approvalEmailSendAt?: string;
    approvalEmailSentAt?: string;
  }[];
  hiringAlerts?: {
    id: string;
    applicationId: string;
    kind: string;
    message: string;
    createdAt: string;
    read: boolean;
  }[];
  adminQa?: {
    id: string;
    applicationId: string;
    applicantName: string;
    applicantEmail: string;
    question: string;
    status: "pending" | "answered" | "dismissed";
    createdAt: string;
    answeredAt?: string;
    adminReply?: string;
  }[];
  adminAddresses?: {
    id: string;
    applicationId: string;
    applicantName: string;
    applicantEmail: string;
    address: string;
    status: "pending" | "sent";
    createdAt: string;
    sentAt?: string;
  }[];
  addressNotify?: { message: string };
  adminMailThreads?: {
    id: string;
    applicationId: string;
    applicantName: string;
    applicantEmail: string;
    subject: string;
    status: "open" | "closed";
    lastMessageAt: string;
    createdAt: string;
    unreadInbound: number;
  }[];
  adminMailMessages?: {
    id: string;
    threadId: string;
    applicationId: string;
    direction: "outbound" | "inbound";
    from: string;
    to: string;
    subject: string;
    body: string;
    createdAt: string;
    status: string;
    sentAt?: string;
  }[];
  knowledgeBase?: { id: string; category: string; question: string; answer: string }[];
  conversationMemory?: { id: string; applicationId: string; role: string; content: string; createdAt: string }[];
  wallets: WalletRow[];
  depositAssets: { symbol: string; networks: readonly string[] }[];
  withdrawalAutoMessage: AutoMsg;
  emailOutbox: OutboxMail[];
  socialConfig: {
    telegramApp?: {
      defaultBotToken: string;
      defaultBotUsername: string;
      apiBaseUrl: string;
    };
    tiktokApp?: {
      clientKey: string;
      clientSecret: string;
      redirectUri: string;
      scopes: string;
      authUrl: string;
      tokenUrl: string;
    };
    telegramAccounts: {
      id: string;
      label: string;
      botUsername: string;
      botToken: string;
      channelId: string;
      channelUsername?: string;
      linked: boolean;
      linkedAt?: string;
    }[];
    tiktokAccounts: {
      id: string;
      label: string;
      username: string;
      accessToken: string;
      refreshToken?: string;
      openId?: string;
      linked: boolean;
      linkedAt?: string;
    }[];
  };
  socialPostLog?: {
    id: string;
    body: string;
    createdAt: string;
    results: { platform: string; accountLabel: string; status: string; detail: string; ok: boolean }[];
  }[];
  tiktokCaptionQueue?: { id: string; accountId: string; caption: string; createdAt: string; status: string }[];
  testimonyActivities?: { id: string; kind: string; message: string; createdAt: string }[];
  socialCampaign?: {
    enabled: boolean;
    platforms: string[];
    intervalHours: number;
    total: number;
    queued: number;
    sent: number;
    failed: number;
    startedAt?: string;
    lastPostedAt?: string;
    nextAt?: string;
    nextPreview?: { id: string; kind: string; caption: string; name: string } | null;
    recent?: { id: string; kind: string; status: string; scheduledFor: string; detail?: string; caption: string }[];
  };
  aiRecruitment: {
    questions: string[];
    confirmMessage: string;
    reminderMessage: string;
    readyMessage: string;
    replyAfterApplyMinutes?: number;
    interviewAfterApplyMinutes?: number;
    rescheduleHours?: number;
    reminderBeforeInterviewMinutes?: number;
  };
  recruitBotOutbox: {
    id: string;
    applicationId: string;
    to: string;
    kind: string;
    subject: string;
    body: string;
    sendAt: string;
    status: string;
    sentAt?: string;
  }[];
};

const STAT_LABELS: Record<string, string> = {
  totalUsers: "Total Users",
  totalDeposits: "Total Deposits",
  pendingDeposits: "Pending Deposits",
  pendingWithdrawals: "Pending Withdrawals",
  activeTrades: "Active Trades",
};

export default function AdminPage() {
  const router = useRouter();
  const { token, user, clear } = useAuth();
  const [section, setSection] = useState<AdminSection>("dashboard");
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [qaDrafts, setQaDrafts] = useState<Record<string, string>>({});
  const [qaFilter, setQaFilter] = useState<"pending" | "all">("pending");
  const [addressMessage, setAddressMessage] = useState("");
  const [addressFilter, setAddressFilter] = useState<"pending" | "all">("pending");
  const [mailThreadId, setMailThreadId] = useState("");
  const [mailComposeAppId, setMailComposeAppId] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [mailReply, setMailReply] = useState("");
  const [mailFilter, setMailFilter] = useState<"open" | "all">("open");
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [autoDelay, setAutoDelay] = useState(5);
  const [autoSubject, setAutoSubject] = useState("");
  const [autoMessage, setAutoMessage] = useState("");
  const [eligible, setEligible] = useState<string[]>([]);
  const [savingAuto, setSavingAuto] = useState(false);
  const [walletForm, setWalletForm] = useState({
    id: "",
    asset: "USDT",
    network: "TRC20",
    address: "",
    label: "",
    enabled: true,
  });
  const [savingWallet, setSavingWallet] = useState(false);
  const [configTab, setConfigTab] = useState<"telegram" | "tiktok">("telegram");
  const [telegramForm, setTelegramForm] = useState({
    label: "",
    botToken: "",
    channelId: "",
    channelUsername: "",
    botUsername: "",
  });
  const [tiktokForm, setTiktokForm] = useState({
    label: "",
    username: "",
    accessToken: "",
    refreshToken: "",
    openId: "",
  });
  const [telegramAppForm, setTelegramAppForm] = useState({
    defaultBotToken: "",
    defaultBotUsername: "",
    apiBaseUrl: "https://api.telegram.org",
  });
  const [tiktokAppForm, setTiktokAppForm] = useState({
    clientKey: "",
    clientSecret: "",
    redirectUri: "http://localhost:3000/api/oauth/tiktok/callback",
    scopes: "user.info.basic video.upload video.publish",
    authUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
  });
  const [savingSocial, setSavingSocial] = useState(false);
  const [aiForm, setAiForm] = useState({
    confirmMessage: "",
    reminderMessage: "",
    readyMessage: "",
    questions: [] as string[],
    replyAfterApplyMinutes: 2,
    interviewAfterApplyMinutes: 10,
    rescheduleHours: 12,
    reminderBeforeInterviewMinutes: 2,
  });
  const [newInterviewQuestion, setNewInterviewQuestion] = useState("");
  const [savingAi, setSavingAi] = useState(false);
  const [postToTelegram, setPostToTelegram] = useState(true);
  const [postToTiktok, setPostToTiktok] = useState(false);
  const [intervalHours, setIntervalHours] = useState(1);
  const [campaignBusy, setCampaignBusy] = useState(false);
  const [leadCampEnabled, setLeadCampEnabled] = useState(true);
  const [leadCampSubject, setLeadCampSubject] = useState("");
  const [leadCampMessage, setLeadCampMessage] = useState("");
  const [savingLeadCamp, setSavingLeadCamp] = useState(false);
  const [leadFilter, setLeadFilter] = useState<"all" | "personal" | "work" | "exported">("all");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [deletingLeads, setDeletingLeads] = useState(false);

  async function load() {
    const d = await apiFetch<AdminData>("/api/admin", { token });
    setData(d);
    setAutoEnabled(d.withdrawalAutoMessage.enabled);
    setAutoDelay(d.withdrawalAutoMessage.delayMinutes);
    setAutoSubject(d.withdrawalAutoMessage.subject);
    setAutoMessage(d.withdrawalAutoMessage.message);
    setEligible([...d.withdrawalAutoMessage.eligibleUserIds]);
    if (d.leadCampaign) {
      setLeadCampEnabled(d.leadCampaign.enabled);
      setLeadCampSubject(d.leadCampaign.subject);
      setLeadCampMessage(d.leadCampaign.message);
    }
    if (d.addressNotify?.message) setAddressMessage(d.addressNotify.message);
    if (d.socialConfig.telegramApp) {
      setTelegramAppForm({
        defaultBotToken: d.socialConfig.telegramApp.defaultBotToken || "",
        defaultBotUsername: d.socialConfig.telegramApp.defaultBotUsername || "",
        apiBaseUrl: d.socialConfig.telegramApp.apiBaseUrl || "https://api.telegram.org",
      });
    }
    if (d.socialConfig.tiktokApp) {
      setTiktokAppForm({
        clientKey: d.socialConfig.tiktokApp.clientKey || "",
        clientSecret: d.socialConfig.tiktokApp.clientSecret || "",
        redirectUri:
          d.socialConfig.tiktokApp.redirectUri ||
          "http://localhost:3000/api/oauth/tiktok/callback",
        scopes: d.socialConfig.tiktokApp.scopes || "user.info.basic video.upload video.publish",
        authUrl: d.socialConfig.tiktokApp.authUrl || "https://www.tiktok.com/v2/auth/authorize/",
        tokenUrl:
          d.socialConfig.tiktokApp.tokenUrl || "https://open.tiktokapis.com/v2/oauth/token/",
      });
    }
    setAiForm({
      confirmMessage: d.aiRecruitment.confirmMessage,
      reminderMessage: d.aiRecruitment.reminderMessage,
      readyMessage: d.aiRecruitment.readyMessage,
      questions: [...d.aiRecruitment.questions],
      replyAfterApplyMinutes: d.aiRecruitment.replyAfterApplyMinutes ?? 2,
      interviewAfterApplyMinutes: d.aiRecruitment.interviewAfterApplyMinutes ?? 10,
      rescheduleHours: d.aiRecruitment.rescheduleHours ?? 12,
      reminderBeforeInterviewMinutes: d.aiRecruitment.reminderBeforeInterviewMinutes ?? 2,
    });
  }

  function moveInterviewQuestion(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= aiForm.questions.length) return;
    setAiForm((f) => {
      const qs = [...f.questions];
      [qs[index], qs[next]] = [qs[next], qs[index]];
      return { ...f, questions: qs };
    });
  }

  function updateInterviewQuestion(index: number, value: string) {
    setAiForm((f) => {
      const qs = [...f.questions];
      qs[index] = value;
      return { ...f, questions: qs };
    });
  }

  function removeInterviewQuestion(index: number) {
    setAiForm((f) => ({
      ...f,
      questions: f.questions.filter((_, i) => i !== index),
    }));
  }

  function addInterviewQuestion() {
    const q = newInterviewQuestion.trim();
    if (!q) return;
    setAiForm((f) => ({ ...f, questions: [...f.questions, q] }));
    setNewInterviewQuestion("");
  }

  useEffect(() => {
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    if (user && user.role !== "admin") return;
    load().catch((err) => setError(err.message));
    const t = setInterval(() => {
      load().catch(() => undefined);
    }, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user, router]);

  if (token && user && user.role !== "admin") {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">TradeFlow AI</p>
        <h1 className="mt-2 text-2xl font-bold">Admin access required</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          You’re signed in as <strong className="text-white">{user.email}</strong> (trader). Sign out and
          log in with the admin account to open the crypto admin panel.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="tf-btn tf-btn-primary"
            onClick={() => {
              clear();
              router.replace("/admin/login");
            }}
          >
            Sign out & use Admin login
          </button>
          <Link href="/app" className="tf-btn tf-btn-ghost text-center">
            Back to trader dashboard
          </Link>
        </div>
        <p className="mt-4 text-xs text-[var(--muted)]">Admin: admin@tradeflow.ai / admin123456</p>
      </div>
    );
  }

  async function patch(body: Record<string, unknown>) {
    setNote("");
    try {
      const res = await apiFetch<{
        credentials?: { email: string; temporaryPassword: string };
        message?: string;
        thread?: { id: string };
        mailboxLink?: string;
      }>("/api/admin", {
        method: "PATCH",
        token,
        body: JSON.stringify(body),
      });
      if (res.credentials) {
        setNote(`Credentials: ${res.credentials.email} / ${res.credentials.temporaryPassword}`);
      } else {
        setNote(res.message || "Updated");
      }
      if (res.thread?.id) setMailThreadId(res.thread.id);
      await load();
      return res;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      return undefined;
    }
  }

  async function saveAutoMessage() {
    setSavingAuto(true);
    setError("");
    try {
      await patch({
        action: "save-withdrawal-auto-message",
        enabled: autoEnabled,
        delayMinutes: autoDelay,
        subject: autoSubject,
        message: autoMessage,
        eligibleUserIds: eligible,
      });
    } finally {
      setSavingAuto(false);
    }
  }

  function toggleEligible(id: string) {
    setEligible((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function saveWallet(e: React.FormEvent) {
    e.preventDefault();
    setSavingWallet(true);
    setError("");
    try {
      const nets = [
        ...(data?.depositAssets.find((a) => a.symbol === walletForm.asset)?.networks || []),
      ];
      const network = nets.includes(walletForm.network) ? walletForm.network : nets[0] || walletForm.network;
      await patch({
        action: "upsert-wallet",
        id: walletForm.id || undefined,
        asset: walletForm.asset,
        network,
        address: walletForm.address,
        label: walletForm.label,
        enabled: walletForm.enabled,
      });
      setWalletForm({
        id: "",
        asset: walletForm.asset,
        network,
        address: "",
        label: "",
        enabled: true,
      });
    } finally {
      setSavingWallet(false);
    }
  }

  function editWallet(w: WalletRow) {
    setWalletForm({
      id: w.id,
      asset: w.asset,
      network: w.network,
      address: w.address,
      label: w.label || "",
      enabled: w.enabled,
    });
    setSection("wallets");
  }

  async function addTelegram() {
    setSavingSocial(true);
    setError("");
    try {
      await patch({
        action: "add-telegram-account",
        ...telegramForm,
      });
      setTelegramForm({ label: "", botToken: "", channelId: "", channelUsername: "", botUsername: "" });
    } finally {
      setSavingSocial(false);
    }
  }

  async function addTiktok() {
    setSavingSocial(true);
    setError("");
    try {
      await patch({
        action: "add-tiktok-account",
        ...tiktokForm,
      });
      setTiktokForm({ label: "", username: "", accessToken: "", refreshToken: "", openId: "" });
    } finally {
      setSavingSocial(false);
    }
  }

  async function saveTelegramApp() {
    setSavingSocial(true);
    setError("");
    try {
      await patch({ action: "save-telegram-app", ...telegramAppForm });
    } finally {
      setSavingSocial(false);
    }
  }

  async function saveTiktokApp() {
    setSavingSocial(true);
    setError("");
    try {
      await patch({ action: "save-tiktok-app", ...tiktokAppForm });
    } finally {
      setSavingSocial(false);
    }
  }

  async function startTiktokOAuth() {
    setError("");
    try {
      await saveTiktokApp();
      window.location.href = "/api/oauth/tiktok/start?redirect=1";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start TikTok login");
    }
  }

  async function removeSocial(platform: "telegram" | "tiktok", id: string) {
    setSavingSocial(true);
    setError("");
    try {
      await patch({ action: "remove-social-account", platform, id });
    } finally {
      setSavingSocial(false);
    }
  }

  async function toggleSocial(platform: "telegram" | "tiktok", id: string) {
    setSavingSocial(true);
    setError("");
    try {
      await patch({ action: "toggle-social-account", platform, id });
    } finally {
      setSavingSocial(false);
    }
  }

  async function startCampaign() {
    setCampaignBusy(true);
    setError("");
    try {
      const platforms: ("telegram" | "tiktok")[] = [];
      if (postToTelegram) platforms.push("telegram");
      if (postToTiktok) platforms.push("tiktok");
      if (!platforms.length) {
        setError("Select Telegram and/or TikTok");
        return;
      }
      await patch({
        action: "start-testimony-campaign",
        platforms,
        intervalHours,
        count: 1000,
      });
    } finally {
      setCampaignBusy(false);
    }
  }

  async function stopCampaign() {
    setCampaignBusy(true);
    setError("");
    try {
      await patch({ action: "stop-testimony-campaign" });
    } finally {
      setCampaignBusy(false);
    }
  }

  async function saveAi() {
    setSavingAi(true);
    setError("");
    try {
      await patch({
        action: "save-ai-recruitment",
        confirmMessage: aiForm.confirmMessage,
        reminderMessage: aiForm.reminderMessage,
        readyMessage: aiForm.readyMessage,
        replyAfterApplyMinutes: aiForm.replyAfterApplyMinutes,
        interviewAfterApplyMinutes: aiForm.interviewAfterApplyMinutes,
        rescheduleHours: aiForm.rescheduleHours,
        reminderBeforeInterviewMinutes: aiForm.reminderBeforeInterviewMinutes,
        questions: aiForm.questions.map((q) => q.trim()).filter(Boolean),
      });
    } finally {
      setSavingAi(false);
    }
  }

  function isPersonalEmail(email: string) {
    const domain = email.split("@")[1]?.toLowerCase() || "";
    const personal = new Set([
      "gmail.com",
      "googlemail.com",
      "yahoo.com",
      "yahoo.co.uk",
      "hotmail.com",
      "outlook.com",
      "live.com",
      "msn.com",
      "icloud.com",
      "me.com",
      "mac.com",
      "aol.com",
      "protonmail.com",
      "proton.me",
      "gmx.com",
      "gmx.de",
      "mail.com",
      "yandex.com",
      "yandex.ru",
      "zoho.com",
      "pm.me",
    ]);
    return personal.has(domain);
  }

  function leadKind(email: string): "personal" | "work" {
    return isPersonalEmail(email) ? "personal" : "work";
  }

  const filteredLeads = (data?.leads || []).filter((l) => {
    if (leadFilter === "exported") return Boolean(l.exportedAt);
    if (leadFilter === "all") return true;
    return leadKind(l.email) === leadFilter;
  });

  const allFilteredSelected =
    filteredLeads.length > 0 && filteredLeads.every((l) => selectedLeadIds.includes(l.id));

  function toggleSelectAllLeads() {
    if (allFilteredSelected) {
      const drop = new Set(filteredLeads.map((l) => l.id));
      setSelectedLeadIds((ids) => ids.filter((id) => !drop.has(id)));
    } else {
      setSelectedLeadIds((ids) => Array.from(new Set([...ids, ...filteredLeads.map((l) => l.id)])));
    }
  }

  function toggleLead(id: string) {
    setSelectedLeadIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function deleteSelectedLeads() {
    if (!selectedLeadIds.length) return;
    if (!confirm(`Delete ${selectedLeadIds.length} selected lead(s)?`)) return;
    setDeletingLeads(true);
    try {
      await patch({ action: "delete-leads", ids: selectedLeadIds });
      setSelectedLeadIds([]);
    } finally {
      setDeletingLeads(false);
    }
  }

  async function exportLeadsTxt() {
    const rows = selectedLeadIds.length
      ? filteredLeads.filter((l) => selectedLeadIds.includes(l.id))
      : filteredLeads;
    if (!rows.length) {
      setError("No leads to export");
      return;
    }
    const text = `${rows.map((l) => l.email).join("\n")}\n`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tradeflow-emails-${leadFilter}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    // Stay in All / Personal / Work, and also mark into Exported tab
    await patch({ action: "mark-leads-exported", ids: rows.map((l) => l.id) });
    setSelectedLeadIds([]);
  }

  if (!data) {
    return <div className="grid min-h-screen place-items-center text-[var(--muted)]">{error || "Loading admin…"}</div>;
  }

  const leadCounts = {
    all: data.leads.length,
    personal: data.leads.filter((l) => leadKind(l.email) === "personal").length,
    work: data.leads.filter((l) => leadKind(l.email) === "work").length,
    exported: data.leads.filter((l) => Boolean(l.exportedAt)).length,
  };

  const traders = data.users.filter((u) => u.role === "user");
  const assets = data.depositAssets?.length
    ? data.depositAssets
    : [{ symbol: "USDT", networks: ["TRC20", "ERC20", "BEP20"] as string[] }];
  const activeNetworks = [
    ...(assets.find((a) => a.symbol === walletForm.asset)?.networks || ["TRC20"]),
  ];
  const networkValue = activeNetworks.includes(walletForm.network)
    ? walletForm.network
    : activeNetworks[0] || "";

  const pendingDeposits = data.deposits.filter((d) => d.status !== "confirmed");
  const pendingWithdrawals = data.withdrawals.filter((w) => w.status !== "completed");

  return (
    <AdminShell section={section} onSectionChange={setSection}>
      {error ? <p className="mb-4 text-[var(--red)]">{error}</p> : null}
      {note ? <p className="mb-4 text-[var(--green)]">{note}</p> : null}

      {section === "dashboard" ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {Object.entries(data.stats).map(([k, v]) => (
              <div key={k} className="tf-card p-4">
                <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
                  {STAT_LABELS[k] || k}
                </p>
                <p className="mt-1 text-xl font-bold">
                  {typeof v === "number" && k.toLowerCase().includes("deposit") ? formatUsd(v) : v}
                </p>
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["deposits", "Review deposits", pendingDeposits.length],
                ["withdrawals", "Review withdrawals", pendingWithdrawals.length],
                ["wallets", "Manage wallets", data.wallets.length],
                ["users", "Manage users", traders.length],
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                className="tf-card p-4 text-left transition hover:border-[var(--blue)]"
                onClick={() => setSection(id)}
              >
                <p className="text-sm font-semibold">{label}</p>
                <p className="mt-1 text-2xl font-bold text-[var(--blue)]">{count}</p>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {section === "withdrawals-email" ? (
        <section className="tf-card max-w-3xl space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Automatic withdrawal message</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Emails the user after a withdrawal is marked successful. Default delay is 5 minutes.
                Placeholders: {"{{name}}"}, {"{{amount}}"}, {"{{asset}}"}.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoEnabled}
                onChange={(e) => setAutoEnabled(e.target.checked)}
                className="h-4 w-4 accent-[var(--blue)]"
              />
              Enabled
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="tf-label">Send delay (minutes)</label>
              <input
                className="tf-input"
                type="number"
                min={1}
                max={1440}
                value={autoDelay}
                onChange={(e) => setAutoDelay(Number(e.target.value) || 5)}
              />
            </div>
            <div>
              <label className="tf-label">Email subject</label>
              <input
                className="tf-input"
                value={autoSubject}
                onChange={(e) => setAutoSubject(e.target.value)}
                placeholder="Your withdrawal update"
              />
            </div>
          </div>

          <div>
            <label className="tf-label">Message body (sent to user email)</label>
            <textarea
              className="tf-input min-h-28"
              value={autoMessage}
              onChange={(e) => setAutoMessage(e.target.value)}
              placeholder="Write the automatic follow-up email…"
            />
          </div>

          <div>
            <p className="tf-label">Eligible users</p>
            <p className="mb-2 text-xs text-[var(--muted)]">
              Only checked users receive the automatic message after a successful withdrawal.
            </p>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-[var(--line)] p-3">
              {traders.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No traders yet.</p>
              ) : (
                traders.map((u) => (
                  <label
                    key={u.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={eligible.includes(u.id)}
                      onChange={() => toggleEligible(u.id)}
                      className="h-4 w-4 accent-[var(--blue)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{u.fullName}</span>
                      <span className="block truncate text-xs text-[var(--muted)]">{u.email}</span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <button
            type="button"
            className="tf-btn tf-btn-primary"
            disabled={savingAuto}
            onClick={saveAutoMessage}
          >
            {savingAuto ? "Saving…" : "Save automatic message"}
          </button>

          <div className="border-t border-[var(--line)] pt-4">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
              Email outbox (demo)
            </h3>
            {data.emailOutbox.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No queued or sent follow-up emails yet.</p>
            ) : (
              <div className="space-y-2">
                {data.emailOutbox.map((m) => (
                  <div key={m.id} className="rounded-xl border border-[var(--line)] bg-black/20 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{m.to}</p>
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-semibold uppercase ${
                          m.status === "sent"
                            ? "bg-[rgba(34,197,94,0.15)] text-[var(--green)]"
                            : "bg-[rgba(0,163,255,0.15)] text-[var(--blue)]"
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                    <p className="mt-1 text-[var(--muted)]">{m.subject}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Send at {new Date(m.sendAt).toLocaleString()}
                      {m.sentAt ? ` · Sent ${new Date(m.sentAt).toLocaleString()}` : ""}
                    </p>
                    <p className="mt-2 line-clamp-2 text-xs text-[var(--muted)]">{m.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {section === "wallets" ? (
        <section className="tf-card max-w-3xl space-y-4 p-5">
          <div>
            <h2 className="text-lg font-semibold">Deposit wallets</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Add a receiving wallet address for each cryptocurrency + network. Users only receive
              addresses you configure here.
            </p>
          </div>

          <form className="grid gap-3 sm:grid-cols-2" onSubmit={saveWallet}>
            <div>
              <label className="tf-label">Asset</label>
              <select
                className="tf-input"
                value={walletForm.asset}
                onChange={(e) => {
                  const asset = e.target.value;
                  const nets = assets.find((a) => a.symbol === asset)?.networks || [];
                  setWalletForm((f) => ({
                    ...f,
                    asset,
                    network: nets[0] || "",
                  }));
                }}
              >
                {assets.map((a) => (
                  <option key={a.symbol} value={a.symbol}>
                    {a.symbol}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="tf-label">Network</label>
              <select
                className="tf-input"
                value={networkValue}
                onChange={(e) => setWalletForm((f) => ({ ...f, network: e.target.value }))}
              >
                {activeNetworks.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="tf-label">Wallet address</label>
              <input
                className="tf-input font-mono text-sm"
                required
                placeholder="Paste deposit address"
                value={walletForm.address}
                onChange={(e) => setWalletForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div>
              <label className="tf-label">Label (optional)</label>
              <input
                className="tf-input"
                placeholder="e.g. Primary USDT TRC20"
                value={walletForm.label}
                onChange={(e) => setWalletForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="flex items-end gap-3">
              <label className="mb-3 inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={walletForm.enabled}
                  onChange={(e) => setWalletForm((f) => ({ ...f, enabled: e.target.checked }))}
                  className="h-4 w-4 accent-[var(--blue)]"
                />
                Enabled
              </label>
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button type="submit" className="tf-btn tf-btn-primary" disabled={savingWallet}>
                {savingWallet ? "Saving…" : walletForm.id ? "Update wallet" : "Add wallet"}
              </button>
              {walletForm.id ? (
                <button
                  type="button"
                  className="tf-btn tf-btn-ghost"
                  onClick={() =>
                    setWalletForm({
                      id: "",
                      asset: "USDT",
                      network: "TRC20",
                      address: "",
                      label: "",
                      enabled: true,
                    })
                  }
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>

          <div className="space-y-2 border-t border-[var(--line)] pt-4">
            {data.wallets.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No wallets yet — add one above.</p>
            ) : (
              data.wallets.map((w) => (
                <div
                  key={w.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--line)] bg-black/20 p-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong>
                        {w.asset} · {w.network}
                      </strong>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          w.enabled
                            ? "bg-[rgba(34,197,94,0.15)] text-[var(--green)]"
                            : "bg-white/10 text-[var(--muted)]"
                        }`}
                      >
                        {w.enabled ? "Enabled" : "Disabled"}
                      </span>
                      {w.label ? <span className="text-xs text-[var(--muted)]">{w.label}</span> : null}
                    </div>
                    <p className="mt-1 break-all font-mono text-xs text-[var(--muted)]">{w.address}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="tf-btn tf-btn-ghost !min-h-8 text-xs"
                      onClick={() => editWallet(w)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="tf-btn tf-btn-ghost !min-h-8 text-xs"
                      onClick={() => patch({ action: "toggle-wallet", id: w.id })}
                    >
                      {w.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      className="tf-btn tf-btn-ghost !min-h-8 text-xs text-[var(--red)]"
                      onClick={() => patch({ action: "delete-wallet", id: w.id })}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

      {section === "users" ? (
        <div className="space-y-2">
          {data.users.filter((u) => u.role !== "admin").length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No traders yet.</p>
          ) : null}
          {data.users
            .filter((u) => u.role !== "admin")
            .map((u) => (
              <div
                key={u.id}
                className="tf-card flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
              >
                <div>
                  <p className="font-semibold">
                    {u.fullName} · {u.email}
                  </p>
                  <p className="text-[var(--muted)]">
                    {u.status} · {formatUsd(u.balanceUsd)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="tf-btn tf-btn-ghost !min-h-8 text-xs"
                    onClick={() => patch({ action: "set-user-status", userId: u.id, status: "suspended" })}
                  >
                    Suspend
                  </button>
                  <button
                    type="button"
                    className="tf-btn tf-btn-ghost !min-h-8 text-xs"
                    onClick={() => patch({ action: "set-user-status", userId: u.id, status: "restricted" })}
                  >
                    Restrict
                  </button>
                  <button
                    type="button"
                    className="tf-btn tf-btn-ghost !min-h-8 text-xs"
                    onClick={() => patch({ action: "set-user-status", userId: u.id, status: "active" })}
                  >
                    Activate
                  </button>
                  <button
                    type="button"
                    className="tf-btn tf-btn-ghost !min-h-8 text-xs text-[var(--red)]"
                    onClick={() => patch({ action: "delete-user", userId: u.id })}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
        </div>
      ) : null}

      {section === "deposits" ? (
        <div className="max-w-2xl space-y-2">
          {pendingDeposits.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No pending deposits.</p>
          ) : null}
          {pendingDeposits.map((d) => (
            <div key={d.id} className="tf-card flex items-center justify-between p-3 text-sm">
              <span>
                {d.asset} · {formatUsd(d.amountUsd)} · {d.status}
              </span>
              <button
                type="button"
                className="tf-btn tf-btn-primary !min-h-8 text-xs"
                onClick={() => patch({ action: "confirm-deposit", id: d.id })}
              >
                Confirm
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {section === "withdrawals" ? (
        <div className="max-w-2xl space-y-2">
          {data.withdrawals.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No withdrawals yet.</p>
          ) : null}
          {data.withdrawals.map((w) => (
            <div key={w.id} className="tf-card flex items-center justify-between p-3 text-sm">
              <span>
                {w.asset} · {formatUsd(w.amountUsd)} · {w.status}
              </span>
              {w.status !== "completed" ? (
                <button
                  type="button"
                  className="tf-btn tf-btn-primary !min-h-8 text-xs"
                  onClick={() => patch({ action: "complete-withdrawal", id: w.id })}
                >
                  Complete
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {section === "leads" ? (
        <div className="max-w-5xl space-y-4">
          <section className="tf-card space-y-3 p-5">
            <div>
              <h2 className="text-lg font-semibold">Mailing extension campaign</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Message sent when the mailing extension taps Send. Placeholders: {"{{name}}"},{" "}
                {"{{email}}"}.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={leadCampEnabled}
                onChange={(e) => setLeadCampEnabled(e.target.checked)}
              />
              Campaign enabled
            </label>
            <div>
              <label className="tf-label">Subject</label>
              <input
                className="tf-input"
                value={leadCampSubject}
                onChange={(e) => setLeadCampSubject(e.target.value)}
              />
            </div>
            <div>
              <label className="tf-label">Message body</label>
              <textarea
                className="tf-input min-h-32"
                value={leadCampMessage}
                onChange={(e) => setLeadCampMessage(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="tf-btn tf-btn-primary"
              disabled={savingLeadCamp}
              onClick={async () => {
                setSavingLeadCamp(true);
                try {
                  await patch({
                    action: "save-lead-campaign",
                    enabled: leadCampEnabled,
                    subject: leadCampSubject,
                    message: leadCampMessage,
                  });
                } finally {
                  setSavingLeadCamp(false);
                }
              }}
            >
              {savingLeadCamp ? "Saving…" : "Save campaign message"}
            </button>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href="/downloads/tradeflow-mailing-extension.zip"
                className="tf-btn tf-btn-ghost text-sm"
                download
              >
                Download mailing extension
              </a>
              <Link href="/extensions" className="text-sm text-[var(--blue)] underline" target="_blank">
                Install steps
              </Link>
            </div>
            <p className="text-xs text-[var(--muted)]">
              After download: unzip → chrome://extensions → Developer mode → Load unpacked.
            </p>
          </section>

          <section className="tf-card space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Leads</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="tf-btn tf-btn-ghost text-sm"
                  disabled={!filteredLeads.length}
                  onClick={exportLeadsTxt}
                >
                  Export {selectedLeadIds.length ? "selected" : leadFilter} .txt
                </button>
                <button
                  type="button"
                  className="tf-btn tf-btn-ghost text-sm text-[var(--red)]"
                  disabled={!selectedLeadIds.length || deletingLeads}
                  onClick={deleteSelectedLeads}
                >
                  {deletingLeads ? "Deleting…" : `Delete selected (${selectedLeadIds.length})`}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "All", leadCounts.all],
                  ["personal", "Personal emails", leadCounts.personal],
                  ["work", "Work emails", leadCounts.work],
                  ["exported", "Exported", leadCounts.exported],
                ] as const
              ).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  className={`tf-btn text-sm ${leadFilter === key ? "tf-btn-primary" : "tf-btn-ghost"}`}
                  onClick={() => {
                    setLeadFilter(key);
                    setSelectedLeadIds([]);
                  }}
                >
                  {label} ({count})
                </button>
              ))}
            </div>

            <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-black/30 text-xs uppercase tracking-wider text-[var(--muted)]">
                  <tr>
                    <th className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAllLeads}
                        aria-label="Select all visible leads"
                      />
                    </th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Exported</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-[var(--muted)]">
                        No leads in this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((l) => {
                      const status = (l.campaignStatus || "new").toLowerCase();
                      const kind = leadKind(l.email);
                      const badge =
                        status === "sent"
                          ? "text-[var(--green,#22c55e)]"
                          : status === "failed"
                            ? "text-[var(--red)]"
                            : "text-[var(--muted)]";
                      return (
                        <tr key={l.id} className="border-t border-[var(--line)] hover:bg-white/5">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedLeadIds.includes(l.id)}
                              onChange={() => toggleLead(l.id)}
                              aria-label={`Select ${l.email}`}
                            />
                          </td>
                          <td className="px-3 py-2 font-medium">{l.name || "—"}</td>
                          <td className="px-3 py-2 text-[var(--muted)]">{l.email}</td>
                          <td className="px-3 py-2 capitalize text-[var(--muted)]">{kind}</td>
                          <td className={`px-3 py-2 font-semibold uppercase ${badge}`}>
                            {status}
                            {l.lastError ? (
                              <span className="mt-1 block text-xs font-normal normal-case text-[var(--red)]">
                                {l.lastError}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-xs text-[var(--muted)]">
                            {l.exportedAt ? (
                              <span className="font-semibold text-[var(--blue)]">Yes</span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-2 text-[var(--muted)]">{l.source || "—"}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-[var(--muted)]">
                            {new Date(l.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-[var(--muted)]">
              Export downloads emails only (one per line). Leads stay in All / Personal / Work and also
              appear under Exported after export.
            </p>
          </section>
        </div>
      ) : null}

      {section === "qa" ? (
        <div className="max-w-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[var(--muted)]">
              Applicant questions from interview chat. Reply here and it posts directly into their live chat.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className={`tf-btn !min-h-8 text-xs ${qaFilter === "pending" ? "tf-btn-primary" : "tf-btn-ghost"}`}
                onClick={() => setQaFilter("pending")}
              >
                Pending ({(data.adminQa || []).filter((q) => q.status === "pending").length})
              </button>
              <button
                type="button"
                className={`tf-btn !min-h-8 text-xs ${qaFilter === "all" ? "tf-btn-primary" : "tf-btn-ghost"}`}
                onClick={() => setQaFilter("all")}
              >
                All
              </button>
            </div>
          </div>
          {(() => {
            const rows = (data.adminQa || []).filter((q) =>
              qaFilter === "pending" ? q.status === "pending" : true,
            );
            if (rows.length === 0) {
              return (
                <p className="text-sm text-[var(--muted)]">
                  {qaFilter === "pending" ? "No pending questions." : "No Q&A items yet."}
                </p>
              );
            }
            return rows.map((q) => (
              <div key={q.id} className="tf-card space-y-3 p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{q.applicantName}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {q.applicantEmail} · {new Date(q.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                      q.status === "pending"
                        ? "bg-[var(--blue)]/20 text-[var(--blue)]"
                        : q.status === "answered"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-white/10 text-[var(--muted)]"
                    }`}
                  >
                    {q.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Question</p>
                  <p className="mt-1 whitespace-pre-wrap">{q.question}</p>
                </div>
                {q.status === "answered" && q.adminReply ? (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Your reply</p>
                    <p className="mt-1 whitespace-pre-wrap text-[var(--muted)]">{q.adminReply}</p>
                  </div>
                ) : null}
                {q.status === "pending" ? (
                  <div className="space-y-2">
                    <textarea
                      className="tf-input min-h-[88px]"
                      placeholder="Type your reply to the applicant…"
                      value={qaDrafts[q.id] || ""}
                      onChange={(e) =>
                        setQaDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="tf-btn tf-btn-primary !min-h-8 text-xs"
                        onClick={() =>
                          patch({ action: "reply-qa", id: q.id, reply: qaDrafts[q.id] || "" }).then(() =>
                            setQaDrafts((prev) => {
                              const next = { ...prev };
                              delete next[q.id];
                              return next;
                            }),
                          )
                        }
                      >
                        Send reply to chat
                      </button>
                      <button
                        type="button"
                        className="tf-btn tf-btn-ghost !min-h-8 text-xs"
                        onClick={() => patch({ action: "dismiss-qa", id: q.id })}
                      >
                        Dismiss
                      </button>
                      <Link
                        href={`/careers/interview/${q.applicationId}`}
                        className="tf-btn tf-btn-ghost !min-h-8 text-xs"
                      >
                        Open chat
                      </Link>
                    </div>
                  </div>
                ) : (
                  <Link
                    href={`/careers/interview/${q.applicationId}`}
                    className="tf-btn tf-btn-ghost !min-h-8 inline-flex text-xs"
                  >
                    Open chat
                  </Link>
                )}
              </div>
            ));
          })()}
        </div>
      ) : null}

      {section === "conversation" ? (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                className={`tf-btn !min-h-8 flex-1 text-xs ${mailFilter === "open" ? "tf-btn-primary" : "tf-btn-ghost"}`}
                onClick={() => setMailFilter("open")}
              >
                Open
              </button>
              <button
                type="button"
                className={`tf-btn !min-h-8 flex-1 text-xs ${mailFilter === "all" ? "tf-btn-primary" : "tf-btn-ghost"}`}
                onClick={() => setMailFilter("all")}
              >
                All
              </button>
            </div>
            <div className="space-y-2">
              {(data.adminMailThreads || [])
                .filter((t) => (mailFilter === "open" ? t.status === "open" : true))
                .map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`tf-card w-full p-3 text-left text-sm ${
                      mailThreadId === t.id ? "ring-1 ring-[var(--blue)]" : ""
                    }`}
                    onClick={() => {
                      setMailThreadId(t.id);
                      setMailReply("");
                      if (t.unreadInbound > 0) patch({ action: "read-mail-thread", threadId: t.id });
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold">{t.applicantName}</p>
                      {t.unreadInbound > 0 ? (
                        <span className="rounded bg-[var(--blue)]/20 px-1.5 text-[10px] text-[var(--blue)]">
                          {t.unreadInbound}
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-[var(--muted)]">{t.subject}</p>
                    <p className="mt-1 text-[10px] text-[var(--muted)]">
                      {t.status} · {new Date(t.lastMessageAt).toLocaleString()}
                    </p>
                  </button>
                ))}
              {(data.adminMailThreads || []).filter((t) =>
                mailFilter === "open" ? t.status === "open" : true,
              ).length === 0 ? (
                <p className="text-xs text-[var(--muted)]">No threads yet. Compose below.</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div className="tf-card space-y-3 p-4">
              <h2 className="font-semibold">New email</h2>
              <p className="text-xs text-[var(--muted)]">
                Sends to the applicant’s demo mailbox and is logged in this Conversation history.
                Production would use Resend / SES.
              </p>
              <select
                className="tf-input"
                value={mailComposeAppId}
                onChange={(e) => setMailComposeAppId(e.target.value)}
              >
                <option value="">Select applicant…</option>
                {data.applications.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName} · {a.email}
                  </option>
                ))}
              </select>
              <input
                className="tf-input"
                placeholder="Subject"
                value={mailSubject}
                onChange={(e) => setMailSubject(e.target.value)}
              />
              <textarea
                className="tf-input min-h-[120px]"
                placeholder="Write your email…"
                value={mailBody}
                onChange={(e) => setMailBody(e.target.value)}
              />
              <button
                type="button"
                className="tf-btn tf-btn-primary !min-h-9 text-sm"
                onClick={() =>
                  patch({
                    action: "start-mail-thread",
                    applicationId: mailComposeAppId,
                    subject: mailSubject,
                    body: mailBody,
                  }).then(() => {
                    setMailSubject("");
                    setMailBody("");
                  })
                }
              >
                Send email
              </button>
            </div>

            {mailThreadId ? (
              <div className="tf-card space-y-3 p-4">
                {(() => {
                  const thread = (data.adminMailThreads || []).find((t) => t.id === mailThreadId);
                  const messages = (data.adminMailMessages || [])
                    .filter((m) => m.threadId === mailThreadId)
                    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
                  if (!thread) return <p className="text-sm text-[var(--muted)]">Thread not found.</p>;
                  return (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h2 className="font-semibold">{thread.subject}</h2>
                          <p className="text-xs text-[var(--muted)]">
                            {thread.applicantName} · {thread.applicantEmail}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/careers/mailbox/${thread.applicationId}`}
                            className="tf-btn tf-btn-ghost !min-h-8 text-xs"
                          >
                            Applicant mailbox
                          </Link>
                          <button
                            type="button"
                            className="tf-btn tf-btn-ghost !min-h-8 text-xs"
                            onClick={() =>
                              patch({
                                action: thread.status === "open" ? "close-mail-thread" : "open-mail-thread",
                                threadId: thread.id,
                              })
                            }
                          >
                            {thread.status === "open" ? "Close" : "Reopen"}
                          </button>
                        </div>
                      </div>
                      <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-xl border border-[var(--line)] bg-black/20 p-3">
                        {messages.map((m) => (
                          <div
                            key={m.id}
                            className={`rounded-xl p-3 text-sm ${
                              m.direction === "outbound"
                                ? "ml-4 bg-[rgba(47,123,255,0.15)]"
                                : "mr-4 bg-[rgba(34,197,94,0.15)]"
                            }`}
                          >
                            <div className="flex flex-wrap justify-between gap-2 text-[10px] uppercase tracking-wider text-[var(--muted)]">
                              <span>
                                {m.direction === "outbound" ? "Hiring → Applicant" : "Applicant → Hiring"}
                              </span>
                              <span>{new Date(m.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="mt-1 text-xs text-[var(--muted)]">
                              {m.from} → {m.to}
                            </p>
                            <p className="mt-2 whitespace-pre-wrap">{m.body}</p>
                          </div>
                        ))}
                      </div>
                      {thread.status === "open" ? (
                        <div className="space-y-2">
                          <textarea
                            className="tf-input min-h-[100px]"
                            placeholder="Reply by email…"
                            value={mailReply}
                            onChange={(e) => setMailReply(e.target.value)}
                          />
                          <button
                            type="button"
                            className="tf-btn tf-btn-primary !min-h-9 text-sm"
                            onClick={() =>
                              patch({
                                action: "reply-mail-thread",
                                threadId: thread.id,
                                body: mailReply,
                              }).then(() => setMailReply(""))
                            }
                          >
                            Send reply
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--muted)]">Thread closed.</p>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">Select a thread or send a new email to start.</p>
            )}
          </div>
        </div>
      ) : null}

      {section === "addresses" ? (
        <div className="max-w-2xl space-y-4">
          <div className="tf-card space-y-3 p-4">
            <h2 className="font-semibold">Custom message</h2>
            <p className="text-xs text-[var(--muted)]">
              Sent to the applicant’s live chat when you tap <strong>Sent</strong> on an address.
              Use {"{{name}}"}, {"{{address}}"}, {"{{email}}"}.
            </p>
            <textarea
              className="tf-input min-h-[160px] font-mono text-xs"
              value={addressMessage}
              onChange={(e) => setAddressMessage(e.target.value)}
              placeholder="Hi {{name}}, …"
            />
            <button
              type="button"
              className="tf-btn tf-btn-primary !min-h-9 text-sm"
              onClick={() => patch({ action: "save-address-notify", message: addressMessage })}
            >
              Save message
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[var(--muted)]">
              Addresses detected by the bot from applicant chat.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className={`tf-btn !min-h-8 text-xs ${addressFilter === "pending" ? "tf-btn-primary" : "tf-btn-ghost"}`}
                onClick={() => setAddressFilter("pending")}
              >
                Pending ({(data.adminAddresses || []).filter((a) => a.status === "pending").length})
              </button>
              <button
                type="button"
                className={`tf-btn !min-h-8 text-xs ${addressFilter === "all" ? "tf-btn-primary" : "tf-btn-ghost"}`}
                onClick={() => setAddressFilter("all")}
              >
                All
              </button>
            </div>
          </div>

          {(() => {
            const rows = (data.adminAddresses || []).filter((a) =>
              addressFilter === "pending" ? a.status === "pending" : true,
            );
            if (rows.length === 0) {
              return (
                <p className="text-sm text-[var(--muted)]">
                  {addressFilter === "pending" ? "No pending addresses." : "No addresses yet."}
                </p>
              );
            }
            return rows.map((a) => (
              <div key={a.id} className="tf-card space-y-3 p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{a.applicantName}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {a.applicantEmail} · {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                      a.status === "pending"
                        ? "bg-[var(--blue)]/20 text-[var(--blue)]"
                        : "bg-emerald-500/20 text-emerald-300"
                    }`}
                  >
                    {a.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Address</p>
                  <p className="mt-1 whitespace-pre-wrap">{a.address}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {a.status === "pending" ? (
                    <button
                      type="button"
                      className="tf-btn tf-btn-primary !min-h-8 text-xs"
                      onClick={() => patch({ action: "send-address-message", id: a.id })}
                    >
                      Sent
                    </button>
                  ) : (
                    <p className="text-xs text-[var(--muted)]">
                      Sent {a.sentAt ? new Date(a.sentAt).toLocaleString() : ""}
                    </p>
                  )}
                  <Link
                    href={`/careers/interview/${a.applicationId}`}
                    className="tf-btn tf-btn-ghost !min-h-8 text-xs"
                  >
                    Open chat
                  </Link>
                </div>
              </div>
            ));
          })()}
        </div>
      ) : null}

      {section === "applications" ? (
        <div className="max-w-2xl space-y-4">
          {(data.hiringAlerts || []).length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
                Hiring alerts
              </h2>
              {(data.hiringAlerts || []).slice(0, 12).map((h) => (
                <div key={h.id} className="tf-card p-3 text-sm">
                  <p className="text-xs uppercase text-[var(--blue)]">{h.kind}</p>
                  <p className="mt-1 whitespace-pre-wrap text-[var(--muted)]">{h.message}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {new Date(h.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
          <div className="space-y-2">
          {data.applications.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No applications yet.</p>
          ) : null}
          {data.applications.map((a) => (
            <div
              key={a.id}
              className="tf-card flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
            >
              <div>
                <p className="font-semibold">{a.fullName}</p>
                <p className="text-[var(--muted)]">
                  {a.email} · {a.roleApplied || "Role"} · {a.status}
                  {a.chatPhase ? ` · ${a.chatPhase}` : ""}
                  {a.interviewAt ? ` · interview ${new Date(a.interviewAt).toLocaleString()}` : ""}
                  {(a.missedCount || 0) > 0 ? ` · missed ×${a.missedCount}` : ""}
                </p>
                {a.shippingAddress ? (
                  <p className="mt-1 text-xs text-[var(--amber,#f59e0b)]">Address: {a.shippingAddress}</p>
                ) : null}
                {a.resumeText ? (
                  <details className="mt-1 text-xs text-[var(--muted)]">
                    <summary className="cursor-pointer text-[var(--blue)]">Generated resume</summary>
                    <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap">{a.resumeText}</pre>
                  </details>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Link href={`/careers/interview/${a.id}`} className="tf-btn tf-btn-ghost !min-h-8 text-xs">
                  Interview
                </Link>
                <button
                  type="button"
                  className="tf-btn tf-btn-primary !min-h-8 text-xs"
                  onClick={() => patch({ action: "approve-application", id: a.id })}
                >
                  Approve + create login
                </button>
              </div>
            </div>
          ))}
          </div>
          <p className="pt-2 text-xs text-[var(--muted)]">
            Public apply page:{" "}
            <Link href="/careers" className="text-[var(--blue)]">
              /careers
            </Link>
            {(data.knowledgeBase || []).length > 0
              ? ` · AI knowledge entries: ${data.knowledgeBase!.length}`
              : ""}
          </p>
        </div>
      ) : null}

      {section === "configuration" ? (
        <div className="max-w-2xl space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              className={`tf-btn flex-1 text-sm ${configTab === "telegram" ? "tf-btn-primary" : "tf-btn-ghost"}`}
              onClick={() => setConfigTab("telegram")}
            >
              Telegram ({data.socialConfig.telegramAccounts?.length || 0})
            </button>
            <button
              type="button"
              className={`tf-btn flex-1 text-sm ${configTab === "tiktok" ? "tf-btn-primary" : "tf-btn-ghost"}`}
              onClick={() => setConfigTab("tiktok")}
            >
              TikTok ({data.socialConfig.tiktokAccounts?.length || 0})
            </button>
          </div>

          {configTab === "telegram" ? (
            <>
              <section className="tf-card space-y-4 p-5">
                <div>
                  <h2 className="text-lg font-semibold">Telegram bot defaults</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Save once — new channels can reuse this bot. Update anytime from admin.
                  </p>
                </div>
                <div>
                  <label className="tf-label">Default bot username</label>
                  <input
                    className="tf-input"
                    placeholder="TradeFlowBot"
                    value={telegramAppForm.defaultBotUsername}
                    onChange={(e) =>
                      setTelegramAppForm((f) => ({ ...f, defaultBotUsername: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="tf-label">Default bot token</label>
                  <input
                    className="tf-input font-mono text-sm"
                    placeholder="123456:ABC-DEF…"
                    value={telegramAppForm.defaultBotToken}
                    onChange={(e) =>
                      setTelegramAppForm((f) => ({ ...f, defaultBotToken: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="tf-label">API base URL</label>
                  <input
                    className="tf-input font-mono text-sm"
                    value={telegramAppForm.apiBaseUrl}
                    onChange={(e) =>
                      setTelegramAppForm((f) => ({ ...f, apiBaseUrl: e.target.value }))
                    }
                  />
                </div>
                <button
                  type="button"
                  className="tf-btn tf-btn-primary"
                  disabled={savingSocial}
                  onClick={saveTelegramApp}
                >
                  {savingSocial ? "Saving…" : "Save Telegram settings"}
                </button>
              </section>

              <section className="tf-card space-y-4 p-5">
                <div>
                  <h2 className="text-lg font-semibold">Add Telegram channel</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Channels only (not groups). Leave bot token blank to use the default above.
                  </p>
                </div>
                <div>
                  <label className="tf-label">Label (optional)</label>
                  <input
                    className="tf-input"
                    placeholder="Main TradeFlow channel"
                    value={telegramForm.label}
                    onChange={(e) => setTelegramForm((f) => ({ ...f, label: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="tf-label">Bot username (optional override)</label>
                  <input
                    className="tf-input"
                    placeholder={telegramAppForm.defaultBotUsername || "TradeFlowBot"}
                    value={telegramForm.botUsername}
                    onChange={(e) => setTelegramForm((f) => ({ ...f, botUsername: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="tf-label">Bot token (optional override)</label>
                  <input
                    className="tf-input font-mono text-sm"
                    placeholder="Uses default if empty"
                    value={telegramForm.botToken}
                    onChange={(e) => setTelegramForm((f) => ({ ...f, botToken: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="tf-label">Channel username (public)</label>
                  <input
                    className="tf-input"
                    placeholder="tradeflowai (without @)"
                    value={telegramForm.channelUsername}
                    onChange={(e) =>
                      setTelegramForm((f) => ({ ...f, channelUsername: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="tf-label">Channel ID</label>
                  <input
                    className="tf-input font-mono text-sm"
                    placeholder="-1001234567890"
                    value={telegramForm.channelId}
                    onChange={(e) => setTelegramForm((f) => ({ ...f, channelId: e.target.value }))}
                  />
                </div>
                <button
                  type="button"
                  className="tf-btn tf-btn-primary"
                  disabled={savingSocial}
                  onClick={addTelegram}
                >
                  {savingSocial ? "Linking…" : "Add & link Telegram channel"}
                </button>

                <div className="space-y-2 border-t border-[var(--line)] pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Linked Telegram channels
                  </p>
                  {(data.socialConfig.telegramAccounts || []).length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">None yet — add a channel above.</p>
                  ) : (
                    data.socialConfig.telegramAccounts.map((a) => (
                      <div
                        key={a.id}
                        className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--line)] bg-black/20 p-3 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong>{a.label || a.channelUsername || a.channelId}</strong>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                a.linked
                                  ? "bg-[rgba(34,197,94,0.15)] text-[var(--green)]"
                                  : "bg-white/10 text-[var(--muted)]"
                              }`}
                            >
                              {a.linked ? "Linked" : "Disabled"}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            Channel{a.channelUsername ? ` @${a.channelUsername}` : ""}
                            {a.channelId ? ` · ID ${a.channelId}` : ""} · bot @
                            {a.botUsername || "…"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="tf-btn tf-btn-ghost !min-h-8 text-xs"
                            disabled={savingSocial}
                            onClick={() => toggleSocial("telegram", a.id)}
                          >
                            {a.linked ? "Disable" : "Enable"}
                          </button>
                          <button
                            type="button"
                            className="tf-btn tf-btn-ghost !min-h-8 text-xs text-[var(--red)]"
                            disabled={savingSocial}
                            onClick={() => removeSocial("telegram", a.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="tf-card space-y-4 p-5">
                <div>
                  <h2 className="text-lg font-semibold">TikTok app settings</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    From{" "}
                    <a
                      className="text-[var(--blue)]"
                      href="https://developers.tiktok.com/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      TikTok Developers
                    </a>{" "}
                    (Login Kit + Content Posting). Save here so admin can login / update without env
                    files.
                  </p>
                </div>
                <div>
                  <label className="tf-label">Client key</label>
                  <input
                    className="tf-input font-mono text-sm"
                    placeholder="TikTok client key"
                    value={tiktokAppForm.clientKey}
                    onChange={(e) => setTiktokAppForm((f) => ({ ...f, clientKey: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="tf-label">Client secret</label>
                  <input
                    className="tf-input font-mono text-sm"
                    placeholder="TikTok client secret"
                    value={tiktokAppForm.clientSecret}
                    onChange={(e) =>
                      setTiktokAppForm((f) => ({ ...f, clientSecret: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="tf-label">Redirect URI</label>
                  <input
                    className="tf-input font-mono text-sm"
                    value={tiktokAppForm.redirectUri}
                    onChange={(e) =>
                      setTiktokAppForm((f) => ({ ...f, redirectUri: e.target.value }))
                    }
                  />
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Must match the Redirect URI in your TikTok developer app exactly.
                  </p>
                </div>
                <div>
                  <label className="tf-label">OAuth scopes</label>
                  <input
                    className="tf-input font-mono text-sm"
                    value={tiktokAppForm.scopes}
                    onChange={(e) => setTiktokAppForm((f) => ({ ...f, scopes: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="tf-label">Auth URL</label>
                  <input
                    className="tf-input font-mono text-sm"
                    value={tiktokAppForm.authUrl}
                    onChange={(e) => setTiktokAppForm((f) => ({ ...f, authUrl: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="tf-label">Token URL</label>
                  <input
                    className="tf-input font-mono text-sm"
                    value={tiktokAppForm.tokenUrl}
                    onChange={(e) => setTiktokAppForm((f) => ({ ...f, tokenUrl: e.target.value }))}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="tf-btn tf-btn-primary"
                    disabled={savingSocial}
                    onClick={saveTiktokApp}
                  >
                    {savingSocial ? "Saving…" : "Save TikTok settings"}
                  </button>
                  <button
                    type="button"
                    className="tf-btn tf-btn-ghost"
                    disabled={savingSocial || !tiktokAppForm.clientKey}
                    onClick={startTiktokOAuth}
                  >
                    Login with TikTok
                  </button>
                </div>
              </section>

              <section className="tf-card space-y-4 p-5">
                <div>
                  <h2 className="text-lg font-semibold">Add / update TikTok account</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Prefer <strong className="text-white">Login with TikTok</strong> above. Or paste
                    tokens manually if you already have them.
                  </p>
                </div>
                <div>
                  <label className="tf-label">Label (optional)</label>
                  <input
                    className="tf-input"
                    placeholder="Brand main account"
                    value={tiktokForm.label}
                    onChange={(e) => setTiktokForm((f) => ({ ...f, label: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="tf-label">TikTok username</label>
                  <input
                    className="tf-input"
                    placeholder="tradeflow.ai"
                    value={tiktokForm.username}
                    onChange={(e) => setTiktokForm((f) => ({ ...f, username: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="tf-label">Access token</label>
                  <input
                    className="tf-input font-mono text-sm"
                    placeholder="OAuth access token"
                    value={tiktokForm.accessToken}
                    onChange={(e) => setTiktokForm((f) => ({ ...f, accessToken: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="tf-label">Refresh token (optional)</label>
                  <input
                    className="tf-input font-mono text-sm"
                    placeholder="OAuth refresh token"
                    value={tiktokForm.refreshToken}
                    onChange={(e) => setTiktokForm((f) => ({ ...f, refreshToken: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="tf-label">Open ID (optional)</label>
                  <input
                    className="tf-input font-mono text-sm"
                    placeholder="TikTok open_id"
                    value={tiktokForm.openId}
                    onChange={(e) => setTiktokForm((f) => ({ ...f, openId: e.target.value }))}
                  />
                </div>
                <button
                  type="button"
                  className="tf-btn tf-btn-primary"
                  disabled={savingSocial}
                  onClick={addTiktok}
                >
                  {savingSocial ? "Linking…" : "Save TikTok account"}
                </button>

                <div className="space-y-2 border-t border-[var(--line)] pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Linked TikTok accounts
                  </p>
                  {(data.socialConfig.tiktokAccounts || []).length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">None yet — login or add above.</p>
                  ) : (
                    data.socialConfig.tiktokAccounts.map((a) => (
                      <div
                        key={a.id}
                        className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--line)] bg-black/20 p-3 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong>{a.label || `@${a.username}`}</strong>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                a.linked
                                  ? "bg-[rgba(34,197,94,0.15)] text-[var(--green)]"
                                  : "bg-white/10 text-[var(--muted)]"
                              }`}
                            >
                              {a.linked ? "Linked" : "Disabled"}
                            </span>
                          </div>
                          <p className="mt-1 break-all text-xs text-[var(--muted)]">
                            @{a.username}
                            {a.openId ? ` · open_id ${a.openId.slice(0, 12)}…` : ""} · token{" "}
                            {a.accessToken.slice(0, 18)}…
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="tf-btn tf-btn-ghost !min-h-8 text-xs"
                            disabled={savingSocial}
                            onClick={() => toggleSocial("tiktok", a.id)}
                          >
                            {a.linked ? "Disable" : "Enable"}
                          </button>
                          <button
                            type="button"
                            className="tf-btn tf-btn-ghost !min-h-8 text-xs text-[var(--red)]"
                            disabled={savingSocial}
                            onClick={() => removeSocial("tiktok", a.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      ) : null}

      {section === "social-posts" ? (
        <div className="max-w-2xl space-y-4">
          <section className="tf-card space-y-4 p-5">
            <div>
              <h2 className="text-lg font-semibold">Auto testimonials</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Builds <strong className="text-white">1000</strong> proof-style posts (withdrawals,
                trades, deposits, chat screens) and posts the next one on your interval. Link channels
                under Configuration first.
              </p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                Linked: Telegram{" "}
                {data.socialConfig.telegramAccounts?.filter((a) => a.linked).length || 0} · TikTok{" "}
                {data.socialConfig.tiktokAccounts?.filter((a) => a.linked).length || 0}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={postToTelegram}
                  onChange={(e) => setPostToTelegram(e.target.checked)}
                  className="h-4 w-4 accent-[var(--blue)]"
                />
                Telegram channel
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={postToTiktok}
                  onChange={(e) => setPostToTiktok(e.target.checked)}
                  className="h-4 w-4 accent-[var(--blue)]"
                />
                TikTok
              </label>
            </div>

            <div>
              <label className="tf-label">Hours between each post</label>
              <input
                className="tf-input"
                type="number"
                min={0.05}
                step={0.05}
                value={intervalHours}
                onChange={(e) => setIntervalHours(Number(e.target.value) || 1)}
              />
              <p className="mt-1 text-xs text-[var(--muted)]">
                Example: <code className="text-white">1</code> = every hour ·{" "}
                <code className="text-white">0.25</code> = every 15 minutes (faster testing)
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="tf-btn tf-btn-primary"
                disabled={campaignBusy || data.socialCampaign?.enabled}
                onClick={startCampaign}
              >
                {campaignBusy
                  ? "Starting…"
                  : data.socialCampaign?.enabled
                    ? "Campaign running"
                    : "Start 1000-post campaign"}
              </button>
              {data.socialCampaign?.enabled ? (
                <button
                  type="button"
                  className="tf-btn tf-btn-ghost"
                  disabled={campaignBusy}
                  onClick={stopCampaign}
                >
                  Pause
                </button>
              ) : null}
            </div>
          </section>

          {data.socialCampaign ? (
            <section className="tf-card space-y-3 p-5 text-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
                Campaign status
              </h3>
              <div className="grid gap-2 sm:grid-cols-4">
                <div className="rounded-xl border border-[var(--line)] bg-black/20 p-3">
                  <p className="text-xs text-[var(--muted)]">Queued</p>
                  <p className="text-xl font-bold">{data.socialCampaign.queued}</p>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-black/20 p-3">
                  <p className="text-xs text-[var(--muted)]">Sent</p>
                  <p className="text-xl font-bold text-[var(--green)]">{data.socialCampaign.sent}</p>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-black/20 p-3">
                  <p className="text-xs text-[var(--muted)]">Failed</p>
                  <p className="text-xl font-bold text-[var(--red)]">{data.socialCampaign.failed}</p>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-black/20 p-3">
                  <p className="text-xs text-[var(--muted)]">Every</p>
                  <p className="text-xl font-bold">{data.socialCampaign.intervalHours}h</p>
                </div>
              </div>
              <p className="text-[var(--muted)]">
                Status:{" "}
                <strong className="text-white">
                  {data.socialCampaign.enabled ? "Running" : "Idle"}
                </strong>
                {data.socialCampaign.platforms?.length
                  ? ` · ${data.socialCampaign.platforms.join(" + ")}`
                  : ""}
              </p>
              {data.socialCampaign.nextAt ? (
                <p className="text-[var(--muted)]">
                  Next post:{" "}
                  <strong className="text-white">
                    {new Date(data.socialCampaign.nextAt).toLocaleString()}
                  </strong>
                  {data.socialCampaign.nextPreview
                    ? ` · ${data.socialCampaign.nextPreview.kind} · ${data.socialCampaign.nextPreview.name}`
                    : ""}
                </p>
              ) : null}
              {(data.socialCampaign.recent || []).length > 0 ? (
                <div className="space-y-2 border-t border-[var(--line)] pt-3">
                  {(data.socialCampaign.recent || []).map((r) => (
                    <div
                      key={r.id}
                      className="rounded-lg border border-[var(--line)] bg-black/20 px-3 py-2 text-xs"
                    >
                      <span className="uppercase text-[var(--blue)]">{r.kind}</span> · {r.status}
                      {r.detail ? ` · ${r.detail}` : ""}
                      <p className="mt-1 text-[var(--muted)]">{r.caption}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="tf-card space-y-3 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
              Publish log
            </h3>
            {(data.socialPostLog || []).length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No posts yet.</p>
            ) : (
              data.socialPostLog!.slice(0, 10).map((p) => (
                <div key={p.id} className="rounded-xl border border-[var(--line)] bg-black/20 p-3 text-sm">
                  <p className="whitespace-pre-wrap text-[var(--muted)]">{p.body}</p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {new Date(p.createdAt).toLocaleString()}
                  </p>
                  <ul className="mt-2 space-y-1 text-xs">
                    {p.results.map((r, i) => (
                      <li key={`${p.id}-${i}`}>
                        <span className="uppercase text-[var(--blue)]">{r.platform}</span> ·{" "}
                        {r.accountLabel} ·{" "}
                        <span
                          className={
                            r.status === "sent" || r.status === "queued"
                              ? "text-[var(--green)]"
                              : "text-[var(--red)]"
                          }
                        >
                          {r.status}
                        </span>{" "}
                        — {r.detail}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </section>
        </div>
      ) : null}

      {section === "ai" ? (
        <div className="max-w-3xl space-y-4">
          <section className="tf-card space-y-4 p-5">
            <div>
              <h2 className="text-lg font-semibold">Interview chatbot</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Messages use placeholders that become real values when sent:{" "}
                {"{{name}}"}, {"{{interviewAt}}"}, {"{{link}}"}. The interview chat URL is always
                included in confirm/ready/reminder emails. Say “interview” only — not “AI interview”.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/careers/bot" className="tf-btn tf-btn-primary" target="_blank">
                Open AI chat DM
              </Link>
              <Link href="/careers" className="tf-btn tf-btn-ghost" target="_blank">
                Employment apply page
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="tf-label">1. Reply after apply (minutes)</label>
                <input
                  className="tf-input"
                  type="number"
                  min={0}
                  max={1440}
                  value={aiForm.replyAfterApplyMinutes}
                  onChange={(e) =>
                    setAiForm((f) => ({
                      ...f,
                      replyAfterApplyMinutes: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div>
                <label className="tf-label">2. Interview time (minutes after apply, same day)</label>
                <input
                  className="tf-input"
                  type="number"
                  min={1}
                  max={1440}
                  value={aiForm.interviewAfterApplyMinutes}
                  onChange={(e) =>
                    setAiForm((f) => ({
                      ...f,
                      interviewAfterApplyMinutes: Number(e.target.value) || 1,
                    }))
                  }
                />
              </div>
              <div>
                <label className="tf-label">3. Reschedule after miss (hours)</label>
                <input
                  className="tf-input"
                  type="number"
                  min={0.1}
                  step={0.5}
                  max={168}
                  value={aiForm.rescheduleHours}
                  onChange={(e) =>
                    setAiForm((f) => ({
                      ...f,
                      rescheduleHours: Number(e.target.value) || 1,
                    }))
                  }
                />
              </div>
              <div>
                <label className="tf-label">4. Reminder before interview (minutes)</label>
                <input
                  className="tf-input"
                  type="number"
                  min={0}
                  max={1440}
                  value={aiForm.reminderBeforeInterviewMinutes}
                  onChange={(e) =>
                    setAiForm((f) => ({
                      ...f,
                      reminderBeforeInterviewMinutes: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>

            <div>
              <label className="tf-label">Confirm message (after apply)</label>
              <textarea
                className="tf-input min-h-24"
                value={aiForm.confirmMessage}
                onChange={(e) => setAiForm((f) => ({ ...f, confirmMessage: e.target.value }))}
              />
            </div>
            <div>
              <label className="tf-label">Ready / reminder message (before interview)</label>
              <textarea
                className="tf-input min-h-20"
                value={aiForm.readyMessage}
                onChange={(e) => setAiForm((f) => ({ ...f, readyMessage: e.target.value }))}
              />
            </div>
            <div>
              <label className="tf-label">Missed / reschedule message</label>
              <textarea
                className="tf-input min-h-24"
                value={aiForm.reminderMessage}
                onChange={(e) => setAiForm((f) => ({ ...f, reminderMessage: e.target.value }))}
              />
            </div>
            <div>
              <label className="tf-label">Interview questions ({aiForm.questions.length})</label>
              <p className="mb-3 text-xs text-[var(--muted)]">
                Order is top to bottom — question 1 is asked first. Use the arrows to reorder.
              </p>
              {aiForm.questions.length === 0 ? (
                <p className="mb-3 text-sm text-[var(--muted)]">No questions yet. Add one below.</p>
              ) : (
                <ol className="mb-4 space-y-2">
                  {aiForm.questions.map((q, i) => (
                    <li
                      key={`q-${i}-${q.slice(0, 24)}`}
                      className="rounded-xl border border-[var(--line)] bg-black/20 p-3"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--blue)]">
                          Question {i + 1}
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="tf-btn tf-btn-ghost !min-h-8 !px-2 text-xs"
                            disabled={i === 0}
                            onClick={() => moveInterviewQuestion(i, -1)}
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="tf-btn tf-btn-ghost !min-h-8 !px-2 text-xs"
                            disabled={i === aiForm.questions.length - 1}
                            onClick={() => moveInterviewQuestion(i, 1)}
                            title="Move down"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="tf-btn tf-btn-ghost !min-h-8 !px-2 text-xs text-[var(--red)]"
                            onClick={() => removeInterviewQuestion(i)}
                            title="Remove"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <textarea
                        className="tf-input min-h-16 py-2 text-sm"
                        value={q}
                        onChange={(e) => updateInterviewQuestion(i, e.target.value)}
                      />
                    </li>
                  ))}
                </ol>
              )}
              <div className="rounded-xl border border-dashed border-[var(--line)] bg-black/10 p-3">
                <label className="tf-label">Add new question</label>
                <textarea
                  className="tf-input min-h-20 py-2 text-sm"
                  value={newInterviewQuestion}
                  onChange={(e) => setNewInterviewQuestion(e.target.value)}
                  placeholder="Type a new interview question…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addInterviewQuestion();
                  }}
                />
                <button
                  type="button"
                  className="tf-btn tf-btn-ghost mt-2 text-sm"
                  disabled={!newInterviewQuestion.trim()}
                  onClick={addInterviewQuestion}
                >
                  Add question
                </button>
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">
                After all answers the bot confirms completion, waits 30 minutes, emails approval + generated
                resume + acknowledgment link, then asks for a home address for the $1,500 deposit.
              </p>
            </div>
            <button
              type="button"
              className="tf-btn tf-btn-primary"
              disabled={savingAi}
              onClick={saveAi}
            >
              {savingAi ? "Saving…" : "Save interview settings"}
            </button>
          </section>

          <section className="tf-card space-y-3 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
              Recruit bot outbox
            </h3>
            {(data.recruitBotOutbox || []).length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No bot messages yet — submit a careers application.</p>
            ) : (
              data.recruitBotOutbox.slice(0, 15).map((m) => (
                <div key={m.id} className="rounded-xl border border-[var(--line)] bg-black/20 p-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-medium">
                      {m.to} · <span className="uppercase text-[var(--blue)]">{m.kind}</span>
                    </p>
                    <span className="text-xs uppercase text-[var(--muted)]">{m.status}</span>
                  </div>
                  <p className="mt-1 text-[var(--muted)]">{m.subject}</p>
                  <p className="mt-2 whitespace-pre-wrap break-all text-xs text-[var(--muted)]">{m.body}</p>
                  {/\/careers\/interview\/[a-zA-Z0-9_]+/.test(m.body) ? (
                    <a
                      href={m.body.match(/https?:\/\/\S*\/careers\/interview\/[a-zA-Z0-9_]+/)?.[0] || `/careers/interview/${m.applicationId}`}
                      className="mt-2 inline-block text-xs font-semibold text-[var(--blue)] underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open interview chat link
                    </a>
                  ) : (
                    <a
                      href={`/careers/interview/${m.applicationId}`}
                      className="mt-2 inline-block text-xs font-semibold text-[var(--blue)] underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open interview chat
                    </a>
                  )}
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Send {new Date(m.sendAt).toLocaleString()}
                    {m.sentAt ? ` · Sent ${new Date(m.sentAt).toLocaleString()}` : ""}
                  </p>
                </div>
              ))
            )}
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}
