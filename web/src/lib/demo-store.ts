import { ACTIVITY_SEED_1000 } from "./activity-seed";
import { MAX_LOSS_PCT } from "./constants";
import {
  buildApplicantResume,
  buildInterviewGreeting,
  CLOSING_ANYTHING_ELSE,
  fillName,
  INTERVIEW_QUESTIONS_15,
  PLATFORM_KNOWLEDGE,
  type KnowledgeEntry,
} from "./recruitment-knowledge";

export type DemoUser = {
  id: string;
  fullName: string;
  email: string;
  country: string;
  phone?: string;
  role: "user" | "admin" | "employee";
  password: string;
  balanceUsd: number;
  totalProfit: number;
  totalDeposits: number;
  totalWithdrawals: number;
  forcePasswordChange?: boolean;
  status: "active" | "suspended" | "restricted";
  referralCode: string;
  createdAt: string;
};

export type DemoDeposit = {
  id: string;
  userId: string;
  amountUsd: number;
  asset: string;
  network: string;
  address: string;
  reference: string;
  status: "pending" | "confirming" | "confirmed";
  createdAt: string;
};

export type DemoWithdrawal = {
  id: string;
  userId: string;
  amountUsd: number;
  asset: string;
  network: string;
  address: string;
  status: "pending" | "processing" | "completed" | "rejected";
  createdAt: string;
  completedAt?: string;
};

export type DemoQueuedEmail = {
  id: string;
  to: string;
  userId: string;
  subject: string;
  body: string;
  kind: "withdrawal-auto-followup" | "interview-approval" | "lead-campaign" | "admin-conversation";
  withdrawalId?: string;
  applicationId?: string;
  leadId?: string;
  sendAt: string;
  status: "queued" | "sent";
  sentAt?: string;
};

export type DemoApplication = {
  id: string;
  fullName: string;
  email: string;
  country: string;
  phone: string;
  experience: string;
  roleApplied: string;
  /**
   * interview_scheduled | interviewing | interview_complete |
   * approved_pending_ack | acknowledged | address_collected | onboarding | missed | approved
   */
  status: string;
  interviewAt: string;
  createdAt: string;
  confirmSendAt: string;
  confirmSentAt?: string;
  interviewStartedAt?: string;
  interviewCompletedAt?: string;
  interviewQuestionIndex: number;
  missedCount: number;
  lastReminderAt?: string;
  approvalEmailSendAt?: string;
  approvalEmailSentAt?: string;
  resumeText?: string;
  ackToken?: string;
  acknowledgedAt?: string;
  shippingAddress?: string;
  addressSubmittedAt?: string;
  /**
   * Chat flow phases:
   * interview → closing_offer → closing_awaiting_question (loop) → awaiting_feedback (closed)
   * → awaiting_ack → awaiting_address → onboarding
   */
  chatPhase:
    | "interview"
    | "closing_offer"
    | "closing_awaiting_question"
    | "awaiting_feedback"
    | "awaiting_ack"
    | "awaiting_address"
    | "onboarding";
};

export type AdminHiringAlert = {
  id: string;
  applicationId: string;
  kind: "address_submitted" | "acknowledged" | "interview_complete" | "applicant_question";
  message: string;
  createdAt: string;
  read: boolean;
};

/** Applicant questions awaiting a human admin reply in chat. */
export type AdminQaItem = {
  id: string;
  applicationId: string;
  applicantName: string;
  applicantEmail: string;
  question: string;
  status: "pending" | "answered" | "dismissed";
  createdAt: string;
  answeredAt?: string;
  adminReply?: string;
};

/** Applicant shipping addresses collected for admin follow-up. */
export type AdminAddressItem = {
  id: string;
  applicationId: string;
  applicantName: string;
  applicantEmail: string;
  address: string;
  status: "pending" | "sent";
  createdAt: string;
  sentAt?: string;
};

export type AddressNotifySettings = {
  /** Message pushed to applicant chat when admin taps Sent */
  message: string;
};

export const DEFAULT_ADDRESS_NOTIFY: AddressNotifySettings = {
  message: [
    "Hi {{name}},",
    "",
    "Thank you — we received your shipping address:",
    "{{address}}",
    "",
    "Our team is arranging your $1,500 first trading deposit package. We’ll update you by email if we need anything else.",
    "",
    "— TradeFlow Hiring",
  ].join("\n"),
};

/** Email threads between hiring team and applicants (Conversation mailing). */
export type AdminMailMessage = {
  id: string;
  threadId: string;
  applicationId: string;
  direction: "outbound" | "inbound";
  from: string;
  to: string;
  subject: string;
  body: string;
  createdAt: string;
  status: "sent" | "failed";
  sentAt?: string;
  outboxId?: string;
};

export type AdminMailThread = {
  id: string;
  applicationId: string;
  applicantName: string;
  applicantEmail: string;
  subject: string;
  status: "open" | "closed";
  lastMessageAt: string;
  createdAt: string;
  unreadInbound: number;
};

export const HIRING_MAIL_FROM = "hiring@tradeflow.ai";

export type ConversationMemoryRow = {
  id: string;
  applicationId: string;
  role: "assistant" | "applicant" | "system";
  content: string;
  createdAt: string;
};

export type WithdrawalAutoMessageSettings = {
  enabled: boolean;
  /** Minutes after successful withdrawal before email is sent */
  delayMinutes: number;
  subject: string;
  message: string;
  /** User IDs eligible to receive the follow-up email */
  eligibleUserIds: string[];
};

export type DemoTrade = {
  id: string;
  userId: string;
  pair: string;
  amountUsd: number;
  durationSeconds: number;
  status: "active" | "won" | "lost" | "cancelled";
  resultPnl: number;
  startedAt: string;
  endsAt: string;
  /** Market entry when AI opened the session */
  entryPrice?: number;
  /** buy = long, sell = short */
  side?: "buy" | "sell";
};

export type DemoLead = {
  id: string;
  email: string;
  name?: string;
  source: string;
  /** new | queued | sent | failed */
  campaignStatus: string;
  lastError?: string;
  sentAt?: string;
  /** Marked when admin exports this lead to txt */
  exportedAt?: string;
  createdAt: string;
};

export type LeadCampaignSettings = {
  enabled: boolean;
  subject: string;
  message: string;
};

export type RecruitBotMessage = {
  id: string;
  applicationId: string;
  to: string;
  kind: "confirm" | "reminder" | "ready";
  subject: string;
  body: string;
  sendAt: string;
  status: "queued" | "sent";
  sentAt?: string;
};

export type TelegramAccount = {
  id: string;
  label: string;
  botUsername: string;
  botToken: string;
  /** Numeric channel id e.g. -100… (preferred for posting) */
  channelId: string;
  /** Public channel username without @ e.g. tradeflowai */
  channelUsername: string;
  linked: boolean;
  linkedAt?: string;
  createdAt: string;
};

export type TikTokAccount = {
  id: string;
  label: string;
  username: string;
  accessToken: string;
  refreshToken: string;
  openId: string;
  tokenExpiresAt?: string;
  linked: boolean;
  linkedAt?: string;
  createdAt: string;
};

/** Platform app credentials editable in Admin → Configuration */
export type TelegramAppSettings = {
  defaultBotToken: string;
  defaultBotUsername: string;
  apiBaseUrl: string;
};

export type TikTokAppSettings = {
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
  /** Space-separated OAuth scopes */
  scopes: string;
  /** Auth + token endpoints (override if TikTok changes) */
  authUrl: string;
  tokenUrl: string;
};

export type SocialLinkConfig = {
  telegramApp: TelegramAppSettings;
  tiktokApp: TikTokAppSettings;
  telegramAccounts: TelegramAccount[];
  tiktokAccounts: TikTokAccount[];
};

export const DEFAULT_TELEGRAM_APP: TelegramAppSettings = {
  defaultBotToken: "",
  defaultBotUsername: "",
  apiBaseUrl: "https://api.telegram.org",
};

export const DEFAULT_TIKTOK_APP: TikTokAppSettings = {
  clientKey: "",
  clientSecret: "",
  redirectUri: "http://localhost:3000/api/oauth/tiktok/callback",
  scopes: "user.info.basic video.upload video.publish",
  authUrl: "https://www.tiktok.com/v2/auth/authorize/",
  tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
};

export type AiRecruitmentConfig = {
  /** Scripted interview chat questions (in order) */
  questions: string[];
  confirmMessage: string;
  reminderMessage: string;
  readyMessage: string;
  /** Minutes after application before first bot reply */
  replyAfterApplyMinutes: number;
  /** Minutes after application when interview is scheduled (same calendar day) */
  interviewAfterApplyMinutes: number;
  /** Hours later to reschedule if applicant misses */
  rescheduleHours: number;
  /** Minutes before interview to send reminder / ready message */
  reminderBeforeInterviewMinutes: number;
};

export type DemoActivity = {
  id: string;
  kind: string;
  message: string;
  amountUsd?: number;
  amountLabel?: string;
  createdAt: string;
};

export type DemoWallet = {
  id: string;
  asset: string;
  network: string;
  address: string;
  label?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type Store = {
  users: DemoUser[];
  deposits: DemoDeposit[];
  withdrawals: DemoWithdrawal[];
  trades: DemoTrade[];
  leads: DemoLead[];
  applications: DemoApplication[];
  activities: DemoActivity[];
  otp: Record<string, { code: string; expires: number }>;
  sessions: Record<string, string>; // token -> userId
  withdrawalAutoMessage: WithdrawalAutoMessageSettings;
  leadCampaign: LeadCampaignSettings;
  emailOutbox: DemoQueuedEmail[];
  wallets: DemoWallet[];
  socialConfig: SocialLinkConfig;
  aiRecruitment: AiRecruitmentConfig;
  recruitBotOutbox: RecruitBotMessage[];
  interviewMessages: Record<string, InterviewChatMessage[]>;
  /** Persistent FAQ memory for the hiring AI */
  knowledgeBase: KnowledgeEntry[];
  hiringAlerts: AdminHiringAlert[];
  conversationMemory: ConversationMemoryRow[];
  /** Applicant questions for admin live reply */
  adminQa: AdminQaItem[];
  /** Shipping addresses from applicants */
  adminAddresses: AdminAddressItem[];
  addressNotify: AddressNotifySettings;
  /** Hiring email conversations with applicants */
  adminMailThreads: AdminMailThread[];
  adminMailMessages: AdminMailMessage[];
};

export type ChatAttachment = {
  id: string;
  name: string;
  mime: string;
  size: number;
  dataUrl: string;
};

export type InterviewChatMessage = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  /** Applicant delivery: sent (1 tick) → seen (2 ticks) */
  status?: "sent" | "delivered" | "seen";
  attachments?: ChatAttachment[];
};

const g = globalThis as unknown as { __tfStoreV11?: Store };

export const DEFAULT_AI_QUESTIONS = INTERVIEW_QUESTIONS_15.map((q) => q.prompt);

export const DEFAULT_AI_RECRUITMENT: AiRecruitmentConfig = {
  questions: [...DEFAULT_AI_QUESTIONS],
  confirmMessage:
    "Hi {{name}}, thanks for applying to TradeFlow. Your interview is scheduled for {{interviewAt}}.\n\nJoin your interview chat here:\n{{link}}",
  reminderMessage:
    "Hi {{name}}, you missed your interview. We've rescheduled you for {{interviewAt}}.\n\nJoin here:\n{{link}}",
  readyMessage:
    "Hi {{name}}, your interview is ready now. Please join within the next few minutes:\n{{link}}",
  replyAfterApplyMinutes: 2,
  interviewAfterApplyMinutes: 10,
  rescheduleHours: 12,
  reminderBeforeInterviewMinutes: 2,
};

export const DEFAULT_LEAD_CAMPAIGN: LeadCampaignSettings = {
  enabled: true,
  subject: "Join the TradeFlow AI Team - We're Hiring!",
  message: `Hi {{name}},

Join the TradeFlow AI Team - We're Hiring!

About TradeFlow AI

TradeFlow AI is an AI-powered trading platform designed to make trading smarter, simpler, and more accessible. Our intelligent trading bot helps users identify trading opportunities through advanced AI technology, with a focus on lower-risk strategies and the potential for consistent returns. We are committed to providing innovative tools that help our users trade with greater confidence.

As we continue to grow, we're looking for talented and motivated individuals to join our remote team.

Open Remote Positions

Virtual Assistant

Pay: $1,000 per week

Responsibilities:

* Manage emails and schedules
* Assist with administrative tasks
* Organize company documents and reports
* Provide general operational support

Social Media Manager

Pay: $1,000 per week

Responsibilities:

* Manage our social media platforms
* Create engaging content
* Grow our online community
* Monitor analytics and campaign performance

Remote Marketing Representative

Competitive Weekly Pay

Responsibilities:

* Promote TradeFlow AI and its services
* Generate qualified leads
* Build relationships with potential clients
* Support marketing campaigns and brand awareness

Employee Trading Startup Support

To help eligible team members get started with our platform, TradeFlow AI provides up to $1,500 in trading startup support, subject to company terms, eligibility requirements, and applicable policies.

Why Join TradeFlow AI?

* Fully remote positions
* Competitive weekly pay
* Flexible working environment
* Career growth opportunities
* Supportive international team
* Opportunity to work with cutting-edge AI trading technology

If you're interested in becoming part of TradeFlow AI, we'd love to hear from you. Visit our careers page to apply.

- TradeFlow Team`,
};

const LEGACY_LEAD_CAMPAIGN_SNIPPET =
  "Thanks for your interest in TradeFlow. We have remote opportunities growing our trading community";

export const EMPLOYMENT_ROLES = [
  {
    id: "visual-assistant",
    title: "Visual Assistant",
    weeklyPayUsd: 1000,
  },
  {
    id: "social-media-manager",
    title: "Social Media Manager",
    weeklyPayUsd: 1000,
  },
  {
    id: "community-marketing-representative",
    title: "Remote Community Marketing Representative",
    weeklyPayUsd: 800,
  },
] as const;

/** @deprecated prefer aiRecruitment timing fields */
export const RECRUIT_CONFIRM_DELAY_MS = 2 * 60 * 1000;
export const RECRUIT_INTERVIEW_DELAY_MS = 10 * 60 * 1000;
export const RECRUIT_MISS_RESCHEDULE_MS = 12 * 60 * 60 * 1000;

export function recruitTimingMs(cfg?: AiRecruitmentConfig) {
  const c = cfg || getStore().aiRecruitment;
  const replyMin = Math.max(0, Number(c.replyAfterApplyMinutes) || 2);
  const interviewMin = Math.max(1, Number(c.interviewAfterApplyMinutes) || 10);
  const rescheduleHrs = Math.max(0.1, Number(c.rescheduleHours) || 12);
  const reminderMin = Math.max(0, Number(c.reminderBeforeInterviewMinutes) || 2);
  return {
    replyMs: replyMin * 60 * 1000,
    interviewMs: interviewMin * 60 * 1000,
    rescheduleMs: rescheduleHrs * 60 * 60 * 1000,
    reminderBeforeMs: reminderMin * 60 * 1000,
  };
}

/** Schedule interview later today (same calendar day); clamp if it would cross midnight. */
export function scheduleInterviewAt(fromMs: number, delayMs: number) {
  const startOfTomorrow = new Date(fromMs);
  startOfTomorrow.setHours(24, 0, 0, 0);
  let at = fromMs + delayMs;
  if (at >= startOfTomorrow.getTime()) {
    // Keep same day: schedule 30 min before midnight if delay would spill
    at = Math.max(fromMs + 60_000, startOfTomorrow.getTime() - 30 * 60 * 1000);
  }
  return new Date(at).toISOString();
}

function seed(): Store {
  const adminId = "admin-001";
  return {
    users: [
      {
        id: adminId,
        fullName: "Platform Admin",
        email: "admin@tradeflow.ai",
        country: "United States",
        role: "admin",
        password: "admin123456",
        balanceUsd: 0,
        totalProfit: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        status: "active",
        referralCode: "TFADMIN",
        createdAt: new Date().toISOString(),
      },
      {
        id: "demo-user-001",
        fullName: "Demo Trader",
        email: "trader@tradeflow.ai",
        country: "Nigeria",
        role: "user",
        password: "tradeflow123",
        phone: "+234 800 000 0000",
        balanceUsd: 3500,
        totalProfit: 420,
        totalDeposits: 3500,
        totalWithdrawals: 0,
        status: "active",
        referralCode: "TFDEMO01",
        createdAt: new Date().toISOString(),
      },
    ],
    deposits: [],
    withdrawals: [],
    trades: [],
    leads: [],
    applications: [],
    activities: ACTIVITY_SEED_1000.map((a) => ({
      id: a.id,
      kind: a.kind,
      message: a.message,
      amountUsd: a.amountUsd,
      amountLabel: a.amountLabel,
      createdAt: a.createdAt,
    })),
    otp: {},
    sessions: {},
    withdrawalAutoMessage: {
      enabled: true,
      delayMinutes: 5,
      subject: "Your TradeFlow AI withdrawal update",
      message:
        "Your withdrawal was processed successfully. If you have any questions, reply to this email or contact support@tradeflow.ai.",
      eligibleUserIds: ["demo-user-001"],
    },
    leadCampaign: { ...DEFAULT_LEAD_CAMPAIGN },
    emailOutbox: [],
    wallets: [
      {
        id: "wal_usdt_trc20",
        asset: "USDT",
        network: "TRC20",
        address: "TXdemoTradeFlowUsdtTreasury001",
        label: "Primary USDT TRC20",
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "wal_eth_erc20",
        asset: "ETH",
        network: "ERC20",
        address: "0xdemodemotradeflowethtreasury0001",
        label: "Primary ETH",
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "wal_btc",
        asset: "BTC",
        network: "Bitcoin",
        address: "bc1qdemodemotradeflowbtctreasury",
        label: "Primary BTC",
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    socialConfig: {
      telegramApp: { ...DEFAULT_TELEGRAM_APP },
      tiktokApp: { ...DEFAULT_TIKTOK_APP },
      telegramAccounts: [],
      tiktokAccounts: [],
    },
    aiRecruitment: { ...DEFAULT_AI_RECRUITMENT, questions: [...DEFAULT_AI_QUESTIONS] },
    recruitBotOutbox: [],
    interviewMessages: {},
    knowledgeBase: PLATFORM_KNOWLEDGE.map((e) => ({ ...e })),
    hiringAlerts: [],
    conversationMemory: [],
    adminQa: [],
    adminAddresses: [],
    addressNotify: { ...DEFAULT_ADDRESS_NOTIFY },
    adminMailThreads: [],
    adminMailMessages: [],
  };
}

export function getStore(): Store {
  if (!g.__tfStoreV11) g.__tfStoreV11 = seed();
  const s = g.__tfStoreV11;
  // Kick off durable hydrate + periodic save when Supabase service role is configured
  if (typeof setImmediate !== "undefined" || typeof setTimeout !== "undefined") {
    void import("@/lib/supabase/persist-store")
      .then((mod) => {
        mod.ensurePersistLoop(
          () => g.__tfStoreV11 as unknown,
          (payload) => {
            if (payload && typeof payload === "object") {
              g.__tfStoreV11 = payload as Store;
            }
          },
        );
      })
      .catch(() => undefined);
  }
  const raw = s.socialConfig as SocialLinkConfig & {
    telegram?: TelegramAccount;
    tiktok?: TikTokAccount;
  };
  if (!Array.isArray(raw.telegramAccounts)) raw.telegramAccounts = [];
  if (!Array.isArray(raw.tiktokAccounts)) raw.tiktokAccounts = [];
  if (!raw.telegramApp) raw.telegramApp = { ...DEFAULT_TELEGRAM_APP };
  if (!raw.tiktokApp) raw.tiktokApp = { ...DEFAULT_TIKTOK_APP };
  if (!s.aiRecruitment) s.aiRecruitment = { ...DEFAULT_AI_RECRUITMENT, questions: [...DEFAULT_AI_QUESTIONS] };
  const ai = s.aiRecruitment;
  if (typeof ai.replyAfterApplyMinutes !== "number") ai.replyAfterApplyMinutes = 2;
  if (typeof ai.interviewAfterApplyMinutes !== "number") ai.interviewAfterApplyMinutes = 10;
  if (typeof ai.rescheduleHours !== "number") ai.rescheduleHours = 12;
  if (typeof ai.reminderBeforeInterviewMinutes !== "number") ai.reminderBeforeInterviewMinutes = 2;
  if (!Array.isArray(ai.questions) || ai.questions.length < 15) {
    ai.questions = [...DEFAULT_AI_QUESTIONS];
  } else {
    // Replace legacy interview script with the current default set
    const legacy =
      ai.questions.some((q) =>
        /welcome to your TradeFlow interview|Confirm your preferred contact email|Anything else we should know before we wrap/i.test(
          q,
        ),
      ) ||
      ai.questions[1] === "Why do you want to work with TradeFlow?";
    if (legacy) ai.questions = [...DEFAULT_AI_QUESTIONS];
  }
  if (!Array.isArray(s.knowledgeBase) || s.knowledgeBase.length === 0) {
    s.knowledgeBase = PLATFORM_KNOWLEDGE.map((e) => ({ ...e }));
  }
  if (!Array.isArray(s.hiringAlerts)) s.hiringAlerts = [];
  if (!Array.isArray(s.conversationMemory)) s.conversationMemory = [];
  if (!Array.isArray(s.adminQa)) s.adminQa = [];
  if (!Array.isArray(s.adminAddresses)) s.adminAddresses = [];
  if (!s.addressNotify) s.addressNotify = { ...DEFAULT_ADDRESS_NOTIFY };
  if (!s.addressNotify.message) s.addressNotify.message = DEFAULT_ADDRESS_NOTIFY.message;
  if (!Array.isArray(s.adminMailThreads)) s.adminMailThreads = [];
  if (!Array.isArray(s.adminMailMessages)) s.adminMailMessages = [];
  if (!s.interviewMessages) s.interviewMessages = {};
  if (!Array.isArray(s.recruitBotOutbox)) s.recruitBotOutbox = [];
  if (!s.leadCampaign) s.leadCampaign = { ...DEFAULT_LEAD_CAMPAIGN };
  if (typeof s.leadCampaign.enabled !== "boolean") s.leadCampaign.enabled = true;
  if (!s.leadCampaign.subject) s.leadCampaign.subject = DEFAULT_LEAD_CAMPAIGN.subject;
  if (!s.leadCampaign.message) s.leadCampaign.message = DEFAULT_LEAD_CAMPAIGN.message;
  if (
    s.leadCampaign.message.includes(LEGACY_LEAD_CAMPAIGN_SNIPPET) ||
    s.leadCampaign.message.length < 200
  ) {
    s.leadCampaign.subject = DEFAULT_LEAD_CAMPAIGN.subject;
    s.leadCampaign.message = DEFAULT_LEAD_CAMPAIGN.message;
  }
  for (const app of s.applications) {
    if (typeof app.interviewQuestionIndex !== "number") app.interviewQuestionIndex = 0;
    if (!app.chatPhase) {
      if (app.status === "approved" || app.status === "onboarding" || app.status === "address_collected") {
        app.chatPhase = "onboarding";
      } else if (app.status === "acknowledged") app.chatPhase = "awaiting_address";
      else if (app.status === "approved_pending_ack") app.chatPhase = "awaiting_ack";
      else if (app.status === "interview_complete" || app.status === "ai_recommended") {
        app.chatPhase = "awaiting_feedback";
      } else app.chatPhase = "interview";
    }
  }
  return s;
}

export function pushInterviewMessage(
  applicationId: string,
  role: "assistant" | "applicant" | "system",
  content: string,
  extras?: { attachments?: ChatAttachment[]; status?: "sent" | "delivered" | "seen" },
) {
  const store = getStore();
  const createdAt = new Date().toISOString();
  const msg: InterviewChatMessage = {
    id: uid("msg"),
    role,
    content,
    createdAt,
    status: role === "applicant" ? extras?.status || "sent" : undefined,
    attachments: extras?.attachments?.length ? extras.attachments : undefined,
  };
  store.interviewMessages[applicationId] ??= [];
  store.interviewMessages[applicationId].push(msg);
  store.conversationMemory.unshift({
    id: uid("mem"),
    applicationId,
    role,
    content: content || (msg.attachments?.length ? `[attachment: ${msg.attachments.map((a) => a.name).join(", ")}]` : ""),
    createdAt,
  });
  return msg;
}

export const ADMIN_QA_FORWARDED =
  "I’ve shared your question with our hiring team. Their reply will appear in this chat shortly.";

/** True when applicant text looks like a question (not a short yes/no). */
export function looksLikeApplicantQuestion(text: string) {
  const t = String(text || "").trim();
  if (t.length < 8) return false;
  if (/\?/.test(t)) return true;
  return /^(what (is|are|was|were|do|does|did|will|would|can|about)\b|how (much|many|do|does|can|will|would|long|soon|often)\b|why (do|are|is|would|can)\b|when (do|is|can|will|does)\b|where (do|is|can|will)\b|who (is|are|do)\b|which\b|can you\b|could you\b|do you\b|does the\b|is there\b|are there\b|tell me\b|explain\b|will i\b|would i\b|am i\b)/i.test(
    t,
  );
}

/** Queue an applicant question for Admin → Q&A and notify hiring alerts. */
export function enqueueAdminQa(
  app: Pick<DemoApplication, "id" | "fullName" | "email">,
  question: string,
) {
  const store = getStore();
  const q = String(question || "").trim().slice(0, 4000);
  if (!q) return null;
  // Avoid duplicate pending rows for the same question text on the same application
  const dup = store.adminQa.find(
    (row) =>
      row.applicationId === app.id &&
      row.status === "pending" &&
      row.question.toLowerCase() === q.toLowerCase(),
  );
  if (dup) return dup;

  const item: AdminQaItem = {
    id: uid("qa"),
    applicationId: app.id,
    applicantName: app.fullName,
    applicantEmail: app.email,
    question: q,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  store.adminQa.unshift(item);
  store.hiringAlerts.unshift({
    id: uid("halert"),
    applicationId: app.id,
    kind: "applicant_question",
    message: `${app.fullName} asked: ${q.slice(0, 280)}`,
    createdAt: item.createdAt,
    read: false,
  });
  return item;
}

/** Push admin reply into the live interview chat and mark the Q&A item answered. */
export function replyAdminQa(qaId: string, replyText: string) {
  const store = getStore();
  const item = store.adminQa.find((q) => q.id === qaId);
  if (!item) return { ok: false as const, error: "Q&A item not found" };
  if (item.status === "dismissed") return { ok: false as const, error: "Q&A item was dismissed" };
  const reply = String(replyText || "").trim().slice(0, 4000);
  if (!reply) return { ok: false as const, error: "Reply required" };

  item.status = "answered";
  item.adminReply = reply;
  item.answeredAt = new Date().toISOString();

  const labeled = `Hiring team reply:\n\n${reply}`;
  pushInterviewMessage(item.applicationId, "assistant", labeled);

  const app = store.applications.find((a) => a.id === item.applicationId);
  if (app && (app.chatPhase === "closing_offer" || app.chatPhase === "closing_awaiting_question")) {
    app.chatPhase = "closing_offer";
    pushInterviewMessage(item.applicationId, "assistant", CLOSING_ANYTHING_ELSE);
  }
  return { ok: true as const, item };
}

export function dismissAdminQa(qaId: string) {
  const store = getStore();
  const item = store.adminQa.find((q) => q.id === qaId);
  if (!item) return { ok: false as const, error: "Q&A item not found" };
  item.status = "dismissed";
  item.answeredAt = new Date().toISOString();
  return { ok: true as const, item };
}

/**
 * Heuristic: detect a home/shipping address in free text.
 * Looks for street cues, postal/ZIP patterns, multi-line structure, etc.
 */
export function looksLikeShippingAddress(text: string) {
  const t = String(text || "").trim();
  if (t.length < 16) return false;
  if (looksLikeApplicantQuestion(t) && !/\d/.test(t)) return false;

  const lower = t.toLowerCase();
  const streetCue =
    /\b(street|st\.?|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|drive|dr\.?|lane|ln\.?|court|ct\.?|way|close|crescent|highway|hwy\.?|apartment|apt\.?|suite|unit|floor|block|plot|house)\b/i.test(
      t,
    );
  const postalCue =
    /\b\d{5}(-\d{4})?\b/.test(t) || // US ZIP
    /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i.test(t) || // UK
    /\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b/i.test(t) || // Canadian
    /\b\d{4,6}\b/.test(t);
  const hasNumber = /\d/.test(t);
  const multiPart = t.split(/[\n,]/).map((p) => p.trim()).filter(Boolean).length >= 2;
  const countryCue =
    /\b(united states|usa|u\.s\.a?|united kingdom|uk|nigeria|ghana|kenya|canada|india|pakistan|philippines|australia|germany|france|brazil|mexico|south africa)\b/i.test(
      lower,
    );
  const cityState = /\b[A-Za-z .'-]{2,},\s*[A-Za-z]{2}\b/.test(t); // City, ST

  if (streetCue && hasNumber) return true;
  if (postalCue && hasNumber && (multiPart || streetCue || countryCue || cityState)) return true;
  if (multiPart && hasNumber && (streetCue || postalCue || countryCue || cityState)) return true;
  if (awaitingAddressStyle(t)) return true;
  return false;
}

/** Loose check for address-phase submissions (street + city-like text). */
function awaitingAddressStyle(t: string) {
  const lines = t.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 2 && /\d/.test(t) && t.length >= 20) return true;
  if (/,/.test(t) && /\d/.test(t) && t.length >= 24 && /\b(road|street|st|ave|lane|drive|city|state|zip|postal)\b/i.test(t)) {
    return true;
  }
  return false;
}

/** Queue a detected shipping address for Admin → Address. */
export function enqueueAdminAddress(
  app: Pick<DemoApplication, "id" | "fullName" | "email">,
  address: string,
) {
  const store = getStore();
  const addr = String(address || "").trim().slice(0, 2000);
  if (!addr) return null;

  const dup = store.adminAddresses.find(
    (row) =>
      row.applicationId === app.id &&
      row.status === "pending" &&
      row.address.toLowerCase() === addr.toLowerCase(),
  );
  if (dup) return dup;

  const item: AdminAddressItem = {
    id: uid("addr"),
    applicationId: app.id,
    applicantName: app.fullName,
    applicantEmail: app.email,
    address: addr,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  store.adminAddresses.unshift(item);
  store.hiringAlerts.unshift({
    id: uid("halert"),
    applicationId: app.id,
    kind: "address_submitted",
    message: `${app.fullName} shipping address:\n${addr.slice(0, 400)}`,
    createdAt: item.createdAt,
    read: false,
  });
  return item;
}

function fillAddressNotifyTemplate(
  template: string,
  vars: { name: string; address: string; email?: string },
) {
  return template
    .replaceAll("{{name}}", vars.name)
    .replaceAll("{{address}}", vars.address)
    .replaceAll("{{email}}", vars.email || "");
}

/** Admin taps Sent — push custom message into that applicant's live chat. */
export function sendAddressNotify(addressId: string) {
  const store = getStore();
  const item = store.adminAddresses.find((a) => a.id === addressId);
  if (!item) return { ok: false as const, error: "Address not found" };
  if (item.status === "sent") return { ok: false as const, error: "Message already sent for this address" };

  const firstName = item.applicantName.trim().split(/\s+/)[0] || "there";
  const body = fillAddressNotifyTemplate(store.addressNotify.message || DEFAULT_ADDRESS_NOTIFY.message, {
    name: firstName,
    address: item.address,
    email: item.applicantEmail,
  }).trim();
  if (!body) return { ok: false as const, error: "Address notify message is empty — add a custom message first" };

  pushInterviewMessage(item.applicationId, "assistant", body);
  item.status = "sent";
  item.sentAt = new Date().toISOString();
  return { ok: true as const, item };
}

function mailMailboxLink(applicationId: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/careers/mailbox/${applicationId}`;
}

function appendMailMemory(applicationId: string, direction: "outbound" | "inbound", subject: string, body: string) {
  const store = getStore();
  store.conversationMemory.unshift({
    id: uid("mem"),
    applicationId,
    role: direction === "outbound" ? "assistant" : "applicant",
    content: `[email ${direction}] ${subject}\n${body}`,
    createdAt: new Date().toISOString(),
  });
}

/** Start a new hiring email thread to an applicant (demo: marked sent immediately). */
export function startAdminMailThread(opts: {
  applicationId: string;
  subject: string;
  body: string;
}) {
  const store = getStore();
  const app = store.applications.find((a) => a.id === opts.applicationId);
  if (!app) return { ok: false as const, error: "Application not found" };
  const subject = String(opts.subject || "").trim().slice(0, 240);
  const body = String(opts.body || "").trim().slice(0, 12000);
  if (!subject) return { ok: false as const, error: "Subject required" };
  if (!body) return { ok: false as const, error: "Message body required" };

  const now = new Date().toISOString();
  const threadId = uid("mth");
  const msgId = uid("mmsg");
  const outboxId = uid("mail");
  const mailbox = mailMailboxLink(app.id);
  const bodyWithFooter = [
    body,
    "",
    "——",
    "Reply in your TradeFlow mailbox (demo inbox):",
    mailbox,
    "",
    "— TradeFlow Hiring",
  ].join("\n");

  const outbox: DemoQueuedEmail = {
    id: outboxId,
    to: app.email,
    userId: "",
    subject,
    body: bodyWithFooter,
    kind: "admin-conversation",
    applicationId: app.id,
    sendAt: now,
    status: "sent",
    sentAt: now,
  };
  store.emailOutbox.unshift(outbox);

  const thread: AdminMailThread = {
    id: threadId,
    applicationId: app.id,
    applicantName: app.fullName,
    applicantEmail: app.email,
    subject,
    status: "open",
    lastMessageAt: now,
    createdAt: now,
    unreadInbound: 0,
  };
  store.adminMailThreads.unshift(thread);

  const message: AdminMailMessage = {
    id: msgId,
    threadId,
    applicationId: app.id,
    direction: "outbound",
    from: HIRING_MAIL_FROM,
    to: app.email,
    subject,
    body: bodyWithFooter,
    createdAt: now,
    status: "sent",
    sentAt: now,
    outboxId,
  };
  store.adminMailMessages.push(message);
  appendMailMemory(app.id, "outbound", subject, body);
  return { ok: true as const, thread, message };
}

/** Admin replies inside an existing mail thread. */
export function replyAdminMailThread(threadId: string, bodyText: string) {
  const store = getStore();
  const thread = store.adminMailThreads.find((t) => t.id === threadId);
  if (!thread) return { ok: false as const, error: "Thread not found" };
  if (thread.status === "closed") return { ok: false as const, error: "Thread is closed" };
  const body = String(bodyText || "").trim().slice(0, 12000);
  if (!body) return { ok: false as const, error: "Message body required" };

  const now = new Date().toISOString();
  const subject = thread.subject.startsWith("Re:") ? thread.subject : `Re: ${thread.subject}`;
  const outboxId = uid("mail");
  const mailbox = mailMailboxLink(thread.applicationId);
  const bodyWithFooter = [
    body,
    "",
    "——",
    "Reply in your TradeFlow mailbox (demo inbox):",
    mailbox,
    "",
    "— TradeFlow Hiring",
  ].join("\n");

  store.emailOutbox.unshift({
    id: outboxId,
    to: thread.applicantEmail,
    userId: "",
    subject,
    body: bodyWithFooter,
    kind: "admin-conversation",
    applicationId: thread.applicationId,
    sendAt: now,
    status: "sent",
    sentAt: now,
  });

  const message: AdminMailMessage = {
    id: uid("mmsg"),
    threadId: thread.id,
    applicationId: thread.applicationId,
    direction: "outbound",
    from: HIRING_MAIL_FROM,
    to: thread.applicantEmail,
    subject,
    body: bodyWithFooter,
    createdAt: now,
    status: "sent",
    sentAt: now,
    outboxId,
  };
  store.adminMailMessages.push(message);
  thread.lastMessageAt = now;
  thread.status = "open";
  appendMailMemory(thread.applicationId, "outbound", subject, body);
  return { ok: true as const, thread, message };
}

/** Applicant replies from the demo mailbox (inbound email record). */
export function receiveApplicantMail(opts: {
  applicationId: string;
  threadId?: string;
  subject?: string;
  body: string;
}) {
  const store = getStore();
  const app = store.applications.find((a) => a.id === opts.applicationId);
  if (!app) return { ok: false as const, error: "Application not found" };
  const body = String(opts.body || "").trim().slice(0, 12000);
  if (!body) return { ok: false as const, error: "Message body required" };

  const now = new Date().toISOString();
  let thread = opts.threadId
    ? store.adminMailThreads.find((t) => t.id === opts.threadId && t.applicationId === app.id)
    : undefined;

  if (!thread) {
    // Prefer newest open thread for this applicant
    thread = store.adminMailThreads.find((t) => t.applicationId === app.id && t.status === "open");
  }
  if (!thread) {
    const subject = String(opts.subject || "Message from applicant").trim().slice(0, 240) || "Message from applicant";
    thread = {
      id: uid("mth"),
      applicationId: app.id,
      applicantName: app.fullName,
      applicantEmail: app.email,
      subject,
      status: "open",
      lastMessageAt: now,
      createdAt: now,
      unreadInbound: 0,
    };
    store.adminMailThreads.unshift(thread);
  }

  const subject = thread.subject.startsWith("Re:") ? thread.subject : `Re: ${thread.subject}`;
  const message: AdminMailMessage = {
    id: uid("mmsg"),
    threadId: thread.id,
    applicationId: app.id,
    direction: "inbound",
    from: app.email,
    to: HIRING_MAIL_FROM,
    subject,
    body,
    createdAt: now,
    status: "sent",
    sentAt: now,
  };
  store.adminMailMessages.push(message);
  thread.lastMessageAt = now;
  thread.status = "open";
  thread.unreadInbound = (thread.unreadInbound || 0) + 1;
  appendMailMemory(app.id, "inbound", subject, body);
  return { ok: true as const, thread, message };
}

export function markMailThreadRead(threadId: string) {
  const store = getStore();
  const thread = store.adminMailThreads.find((t) => t.id === threadId);
  if (!thread) return { ok: false as const, error: "Thread not found" };
  thread.unreadInbound = 0;
  return { ok: true as const, thread };
}

export function setMailThreadStatus(threadId: string, status: "open" | "closed") {
  const store = getStore();
  const thread = store.adminMailThreads.find((t) => t.id === threadId);
  if (!thread) return { ok: false as const, error: "Thread not found" };
  thread.status = status;
  return { ok: true as const, thread };
}

export function listMailMessagesForThread(threadId: string) {
  return getStore()
    .adminMailMessages.filter((m) => m.threadId === threadId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function listMailMessagesForApplication(applicationId: string) {
  return getStore()
    .adminMailMessages.filter((m) => m.applicationId === applicationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Greeting + first interview question (always starts the conversation). */
export function seedInterviewConversation(
  applicationId: string,
  app: DemoApplication,
  timezone?: string,
) {
  const store = getStore();
  const qs = interviewQuestions(store);
  const firstName = app.fullName.trim().split(/\s+/)[0] || "there";
  pushInterviewMessage(
    applicationId,
    "assistant",
    buildInterviewGreeting({ name: firstName, country: app.country, timezone }),
  );
  pushInterviewMessage(applicationId, "assistant", fillName(qs[0], firstName));
  app.interviewQuestionIndex = 0;
  app.chatPhase = "interview";
}

/** Mark all applicant messages as seen (double tick). */
export function markApplicantMessagesSeen(applicationId: string) {
  const msgs = getStore().interviewMessages[applicationId] || [];
  for (const m of msgs) {
    if (m.role === "applicant") m.status = "seen";
  }
}

export function normalizeChatAttachments(raw: unknown): ChatAttachment[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatAttachment[] = [];
  for (const item of raw.slice(0, 4)) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const name = String(row.name || "file").slice(0, 180);
    const mime = String(row.mime || "application/octet-stream").slice(0, 120);
    const dataUrl = String(row.dataUrl || "");
    const size = Number(row.size) || 0;
    if (!dataUrl.startsWith("data:") || dataUrl.length > 3_500_000) continue;
    out.push({
      id: uid("att"),
      name,
      mime,
      size,
      dataUrl,
    });
  }
  return out;
}

export function interviewQuestions(store = getStore()) {
  const qs = store.aiRecruitment.questions?.length >= 15 ? store.aiRecruitment.questions : DEFAULT_AI_QUESTIONS;
  return qs;
}

/** After interview complete: queue approval email (+resume + ack link) for 30 minutes later. */
export function scheduleInterviewApprovalEmail(app: DemoApplication, delayMs = 30 * 60 * 1000) {
  app.approvalEmailSendAt = new Date(Date.now() + delayMs).toISOString();
  return app;
}

function acknowledgeLink(token: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/careers/acknowledge/${token}`;
}

/** Build resume from chat Q&A memory and queue congratulatory approval email. */
export function processInterviewApprovals(nowMs = Date.now()) {
  const store = getStore();
  const flushed: DemoQueuedEmail[] = [];

  for (const app of store.applications) {
    if (app.approvalEmailSentAt) continue;
    if (!app.approvalEmailSendAt) continue;
    if (new Date(app.approvalEmailSendAt).getTime() > nowMs) continue;
    if (!["interview_complete", "ai_recommended"].includes(app.status) && app.chatPhase !== "awaiting_feedback") {
      continue;
    }

    const msgs = store.interviewMessages[app.id] || [];
    const answers: { question: string; answer: string }[] = [];
    let lastQ = "";
    for (const m of msgs) {
      if (m.role === "assistant") lastQ = m.content;
      else if (m.role === "applicant" && lastQ) {
        answers.push({ question: lastQ, answer: m.content });
        lastQ = "";
      }
    }

    const resumeText = buildApplicantResume({
      fullName: app.fullName,
      email: app.email,
      phone: app.phone,
      country: app.country,
      roleApplied: app.roleApplied,
      experience: app.experience,
      answers,
    });
    app.resumeText = resumeText;
    app.ackToken = app.ackToken || uid("ack");
    const ackUrl = acknowledgeLink(app.ackToken);
    const name = applicantDisplayName(app.fullName);

    const body = [
      `Hi ${name},`,
      "",
      "Congratulations — your application was approved!",
      "",
      `Role: ${app.roleApplied}`,
      "",
      "We generated a resume from your interview answers (attached in this demo email body).",
      "",
      "Please follow this link to acknowledge your application:",
      ackUrl,
      "",
      "—— RESUME ——",
      resumeText,
      "",
      "— TradeFlow Hiring",
    ].join("\n");

    const mail: DemoQueuedEmail = {
      id: uid("mail"),
      to: app.email,
      userId: "",
      subject: "Congratulations — your TradeFlow application was approved",
      body,
      kind: "interview-approval",
      applicationId: app.id,
      sendAt: new Date(nowMs).toISOString(),
      status: "sent",
      sentAt: new Date(nowMs).toISOString(),
    };
    store.emailOutbox.unshift(mail);
    app.approvalEmailSentAt = mail.sentAt;
    app.status = "approved_pending_ack";
    app.chatPhase = "awaiting_ack";
    pushInterviewMessage(
      app.id,
      "system",
      `Approval email sent to ${app.email}. Waiting for the applicant to acknowledge: ${ackUrl}`,
    );
    store.hiringAlerts.unshift({
      id: uid("halert"),
      applicationId: app.id,
      kind: "interview_complete",
      message: `${app.fullName} approved — resume generated; waiting for acknowledgment.`,
      createdAt: new Date(nowMs).toISOString(),
      read: false,
    });
    flushed.push(mail);
  }

  return flushed;
}

function fillTemplate(
  template: string,
  vars: { name: string; interviewAt: string; link: string; email?: string },
) {
  return template
    .replaceAll("{{name}}", vars.name)
    .replaceAll("{{interviewAt}}", vars.interviewAt)
    .replaceAll("{{link}}", vars.link)
    .replaceAll("{{email}}", vars.email || "");
}

function interviewLink(applicationId: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/careers/interview/${applicationId}`;
}

/** Always include a concrete chat URL in bot emails (even if the admin template omits {{link}}). */
function withInterviewChatLink(body: string, link: string) {
  const filled = String(body || "").trim();
  if (filled.includes(link) || /\/careers\/interview\/[a-zA-Z0-9_]+/.test(filled)) {
    return filled;
  }
  return `${filled}\n\nYour interview chat link:\n${link}`;
}

function applicantDisplayName(fullName: string) {
  const first = String(fullName || "").trim().split(/\s+/)[0];
  return first || "there";
}

/** After apply: confirm reply + interview (same day) using admin timing settings. */
export function scheduleApplicationInterview(app: DemoApplication) {
  const store = getStore();
  const cfg = store.aiRecruitment;
  const timing = recruitTimingMs(cfg);
  const when = new Date(app.interviewAt).toLocaleString();
  const link = interviewLink(app.id);
  const name = applicantDisplayName(app.fullName);

  store.recruitBotOutbox.unshift({
    id: uid("rbot"),
    applicationId: app.id,
    to: app.email,
    kind: "confirm",
    subject: "Your TradeFlow interview is scheduled",
    body: withInterviewChatLink(
      fillTemplate(cfg.confirmMessage, {
        name,
        interviewAt: when,
        link,
        email: app.email,
      }),
      link,
    ),
    sendAt: app.confirmSendAt,
    status: "queued",
  });

  const readyAt = Math.max(
    Date.now(),
    new Date(app.interviewAt).getTime() - timing.reminderBeforeMs,
  );
  store.recruitBotOutbox.unshift({
    id: uid("rbot"),
    applicationId: app.id,
    to: app.email,
    kind: "ready",
    subject: "Your interview is coming up",
    body: withInterviewChatLink(
      fillTemplate(cfg.readyMessage, {
        name,
        interviewAt: when,
        link,
        email: app.email,
      }),
      link,
    ),
    sendAt: new Date(readyAt).toISOString(),
    status: "queued",
  });

  return app;
}

/**
 * Flush due recruit bot messages + mark no-shows and reschedule.
 * Call on careers/admin polls so demo timing advances without a real cron.
 */
export function processRecruitmentBot(nowMs = Date.now()) {
  const store = getStore();
  const cfg = store.aiRecruitment;
  const timing = recruitTimingMs(cfg);
  const flushed: RecruitBotMessage[] = [];

  for (const msg of store.recruitBotOutbox) {
    if (msg.status !== "queued") continue;
    if (new Date(msg.sendAt).getTime() > nowMs) continue;
    msg.status = "sent";
    msg.sentAt = new Date(nowMs).toISOString();
    flushed.push(msg);
    const app = store.applications.find((a) => a.id === msg.applicationId);
    if (app && msg.kind === "confirm") {
      app.confirmSentAt = msg.sentAt;
    }
  }

  for (const app of store.applications) {
    if (!["interview_scheduled", "missed"].includes(app.status)) continue;
    if (app.interviewStartedAt) continue;
    const due = new Date(app.interviewAt).getTime();
    // Grace window: 15 min after slot before counting as missed
    if (nowMs < due + 15 * 60 * 1000) continue;

    app.status = "missed";
    app.missedCount = (app.missedCount || 0) + 1;
    app.interviewAt = new Date(nowMs + timing.rescheduleMs).toISOString();
    app.confirmSendAt = new Date(nowMs + timing.replyMs).toISOString();
    app.lastReminderAt = new Date(nowMs).toISOString();
    app.confirmSentAt = undefined;

    const when = new Date(app.interviewAt).toLocaleString();
    const link = interviewLink(app.id);
    const name = applicantDisplayName(app.fullName);
    store.recruitBotOutbox.unshift({
      id: uid("rbot"),
      applicationId: app.id,
      to: app.email,
      kind: "reminder",
      subject: "Missed interview — rescheduled",
      body: withInterviewChatLink(
        fillTemplate(cfg.reminderMessage, {
          name,
          interviewAt: when,
          link,
          email: app.email,
        }),
        link,
      ),
      sendAt: new Date(nowMs).toISOString(),
      status: "queued",
    });
    store.recruitBotOutbox.unshift({
      id: uid("rbot"),
      applicationId: app.id,
      to: app.email,
      kind: "ready",
      subject: "Your rescheduled interview is coming up",
      body: withInterviewChatLink(
        fillTemplate(cfg.readyMessage, {
          name,
          interviewAt: when,
          link,
          email: app.email,
        }),
        link,
      ),
      sendAt: new Date(
        Math.max(nowMs, new Date(app.interviewAt).getTime() - timing.reminderBeforeMs),
      ).toISOString(),
      status: "queued",
    });
  }

  for (const msg of store.recruitBotOutbox) {
    if (msg.status !== "queued") continue;
    if (new Date(msg.sendAt).getTime() > nowMs) continue;
    msg.status = "sent";
    msg.sentAt = new Date(nowMs).toISOString();
    flushed.push(msg);
  }

  processInterviewApprovals(nowMs);
  flushDueEmails();

  return flushed;
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function issueOtp(email: string) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const store = getStore();
  store.otp[email.toLowerCase()] = { code, expires: Date.now() + 10 * 60 * 1000 };
  // In production: send via Resend/SES. Demo returns code in response for testing.
  return code;
}

export function verifyOtp(email: string, code: string) {
  const row = getStore().otp[email.toLowerCase()];
  if (!row) return false;
  if (Date.now() > row.expires) return false;
  return row.code === code.trim();
}

export function createSession(userId: string) {
  const token = uid("sess");
  getStore().sessions[token] = userId;
  return token;
}

export function userFromToken(token?: string | null) {
  if (!token) return null;
  const userId = getStore().sessions[token];
  if (!userId) return null;
  return getStore().users.find((u) => u.id === userId) || null;
}

export function settleTradeIfDue(trade: DemoTrade, user: DemoUser) {
  if (trade.status !== "active") return trade;
  if (Date.now() < new Date(trade.endsAt).getTime()) return trade;

  // Demo outcome: slight win bias; loss capped at MAX_LOSS_PCT of stake
  const won = Math.random() > 0.42;
  const maxLoss = (trade.amountUsd * MAX_LOSS_PCT) / 100;
  let pnl = 0;
  if (won) {
    pnl = Number((trade.amountUsd * (0.05 + Math.random() * 0.12)).toFixed(2));
  } else {
    pnl = -Number((maxLoss * (0.4 + Math.random() * 0.6)).toFixed(2));
  }
  // Enforce hard cap
  if (pnl < -maxLoss) pnl = -maxLoss;

  trade.status = won ? "won" : "lost";
  trade.resultPnl = pnl;
  // Stake was reserved at open — return stake plus P/L (loss capped at MAX_LOSS_PCT)
  user.balanceUsd = Number((user.balanceUsd + trade.amountUsd + pnl).toFixed(2));
  user.totalProfit = Number((user.totalProfit + pnl).toFixed(2));

  getStore().activities.unshift({
    id: uid("act"),
    kind: "trade",
    message: `${user.fullName.split(" ")[0]} ${won ? "won" : "settled"} ${trade.pair} ${pnl >= 0 ? "+" : ""}$${Math.abs(pnl).toFixed(0)}`,
    amountUsd: Math.abs(pnl),
    createdAt: new Date().toISOString(),
  });
  return trade;
}

/** Settle all due sessions for a user (works even if they left the trade page). */
export function settleUserTrades(userId: string) {
  const store = getStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) return [];
  const settled: DemoTrade[] = [];
  for (const t of store.trades.filter((x) => x.userId === userId && x.status === "active")) {
    const before = t.status;
    settleTradeIfDue(t, user);
    if (before === "active" && t.status !== "active") settled.push(t);
  }
  return settled;
}

/** Send admin lead-campaign message to a lead (demo outbox). */
export function sendLeadCampaignEmail(lead: DemoLead) {
  const store = getStore();
  const cfg = store.leadCampaign;
  if (!cfg?.enabled) {
    lead.campaignStatus = "failed";
    lead.lastError = "Lead campaign is disabled in admin";
    return { ok: false as const, error: lead.lastError };
  }
  if (!cfg.message?.trim()) {
    lead.campaignStatus = "failed";
    lead.lastError = "Campaign message is empty";
    return { ok: false as const, error: lead.lastError };
  }
  const name = (lead.name || lead.email.split("@")[0] || "there").trim();
  try {
    const mail: DemoQueuedEmail = {
      id: uid("mail"),
      to: lead.email,
      userId: "",
      subject: (cfg.subject || "TradeFlow opportunity")
        .replaceAll("{{name}}", name)
        .replaceAll("{{email}}", lead.email),
      body: cfg.message
        .replaceAll("{{name}}", name)
        .replaceAll("{{email}}", lead.email),
      kind: "lead-campaign",
      leadId: lead.id,
      sendAt: new Date().toISOString(),
      status: "sent",
      sentAt: new Date().toISOString(),
    };
    store.emailOutbox.unshift(mail);
    lead.campaignStatus = "sent";
    lead.sentAt = mail.sentAt;
    lead.lastError = undefined;
    return { ok: true as const, mail };
  } catch (e) {
    lead.campaignStatus = "failed";
    lead.lastError = e instanceof Error ? e.message : "Send failed";
    return { ok: false as const, error: lead.lastError };
  }
}

/** Queue the admin-configured follow-up email for 5 minutes after success (demo outbox). */
export function scheduleWithdrawalAutoEmail(withdrawal: DemoWithdrawal) {
  const store = getStore();
  const settings = store.withdrawalAutoMessage;
  if (!settings.enabled || !settings.message.trim()) return null;
  if (!settings.eligibleUserIds.includes(withdrawal.userId)) return null;
  const user = store.users.find((u) => u.id === withdrawal.userId);
  if (!user) return null;
  // Avoid duplicate queue for same withdrawal
  if (store.emailOutbox.some((e) => e.withdrawalId === withdrawal.id && e.kind === "withdrawal-auto-followup")) {
    return null;
  }
  const delayMs = Math.max(1, settings.delayMinutes) * 60 * 1000;
  const row: DemoQueuedEmail = {
    id: uid("mail"),
    to: user.email,
    userId: user.id,
    subject: settings.subject || "Withdrawal update",
    body: settings.message
      .replaceAll("{{name}}", user.fullName)
      .replaceAll("{{amount}}", `$${withdrawal.amountUsd.toFixed(2)}`)
      .replaceAll("{{asset}}", withdrawal.asset),
    kind: "withdrawal-auto-followup",
    withdrawalId: withdrawal.id,
    sendAt: new Date(Date.now() + delayMs).toISOString(),
    status: "queued",
  };
  store.emailOutbox.unshift(row);
  return row;
}

/** Mark due outbox emails as sent (demo — production would call Resend/SES). */
export function flushDueEmails() {
  const now = Date.now();
  const sent: DemoQueuedEmail[] = [];
  for (const mail of getStore().emailOutbox) {
    if (mail.status !== "queued") continue;
    if (new Date(mail.sendAt).getTime() > now) continue;
    mail.status = "sent";
    mail.sentAt = new Date().toISOString();
    sent.push(mail);
  }
  return sent;
}

export function userHasCompletedTradeSession(userId: string) {
  return getStore().trades.some(
    (t) => t.userId === userId && (t.status === "won" || t.status === "lost"),
  );
}

/** Prefer admin-configured deposit wallet; fallback to deterministic demo address. */
export function resolveDepositAddress(asset: string, network: string) {
  const wallet = getStore().wallets.find(
    (w) => w.enabled && w.asset === asset && w.network === network && w.address.trim(),
  );
  if (wallet) return wallet.address.trim();

  const seed = `${asset}-${network}-tradeflow`;
  const hex = Array.from(seed).reduce((a, c) => a + c.charCodeAt(0), 0).toString(16);
  if (asset === "BTC") return `bc1q${hex.padEnd(38, "a").slice(0, 38)}`;
  if (network === "TRC20") return `T${hex.toUpperCase().padEnd(33, "X").slice(0, 33)}`;
  if (asset === "SOL" || network === "Solana") return `${hex}SoL${"1".repeat(32)}`.slice(0, 44);
  return `0x${hex.padEnd(40, "0").slice(0, 40)}`;
}
