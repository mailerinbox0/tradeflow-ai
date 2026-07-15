/**
 * Recruitment knowledge base + 15 interview questions.
 * Stored as app "database" memory so the chatbot can answer consistently.
 */

export type KnowledgeEntry = {
  id: string;
  category: "platform" | "product" | "employment" | "pay" | "onboarding" | "support";
  question: string;
  answer: string;
  tags: string[];
};

export type InterviewQuestion = {
  id: string;
  prompt: string;
  /** Model answer themes used later for resume + memory */
  focus: string;
};

export const PLATFORM_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "kb_platform",
    category: "platform",
    question: "What is TradeFlow?",
    answer:
      "TradeFlow is a professional crypto and markets trading platform. Traders fund a wallet, run bot or manual sessions, track equity, and withdraw profits through supported crypto networks.",
    tags: ["tradeflow", "platform", "what", "about", "company"],
  },
  {
    id: "kb_product",
    category: "product",
    question: "What do we do?",
    answer:
      "We provide secure wallet funding, AI-assisted trading sessions, live market tools, deposit/withdrawal flows, and remote employment roles that help grow the TradeFlow community.",
    tags: ["product", "do", "services", "features", "trading", "bot"],
  },
  {
    id: "kb_employment",
    category: "employment",
    question: "How does employment work?",
    answer:
      "Applicants apply on the careers page, complete an interview in chat, then receive feedback. Approved applicants acknowledge the offer, share a shipping address for the $1,500 first trading deposit package, and get helped setting up their TradeFlow account.",
    tags: ["employment", "job", "hire", "careers", "apply", "interview", "work"],
  },
  {
    id: "kb_roles",
    category: "employment",
    question: "What roles are open?",
    answer:
      "Open remote roles: Visual Assistant ($1,000/week), Social Media Manager ($1,000/week), and Remote Community Marketing Representative ($800/week).",
    tags: ["role", "salary", "pay", "visual", "social", "community", "weekly"],
  },
  {
    id: "kb_deposit",
    category: "onboarding",
    question: "What is the $1,500 first trading deposit?",
    answer:
      "Qualified approved applicants may receive a $1,500 first trading deposit starter package. After you acknowledge your approval, we collect a home address so the company can arrange that deposit support, then help you finish platform setup.",
    tags: ["1500", "deposit", "startup", "bonus", "address", "funding"],
  },
  {
    id: "kb_remote",
    category: "employment",
    question: "Is the job remote?",
    answer:
      "Yes. All listed marketing and visual roles are fully remote, full-time or part-time options depending on availability.",
    tags: ["remote", "hours", "location", "wfh"],
  },
  {
    id: "kb_withdraw",
    category: "product",
    question: "How do withdrawals work?",
    answer:
      "Traders request withdrawals to a crypto address on supported networks. After platform checks, funds are processed to the submitted wallet. Employment applicants should not confuse this with the $1,500 starter deposit flow.",
    tags: ["withdraw", "cashout", "payout"],
  },
  {
    id: "kb_support",
    category: "support",
    question: "How do I get help?",
    answer:
      "You can continue in this interview chat for hiring questions, or email support@tradeflow.ai for account help after onboarding.",
    tags: ["support", "help", "contact", "email"],
  },
];

export const INTERVIEW_QUESTIONS_15: InterviewQuestion[] = [
  {
    id: "q01",
    prompt: "Tell us about yourself and your professional background.",
    focus: "introduction",
  },
  {
    id: "q02",
    prompt: "Why do you want to work with TradeFlow AI?",
    focus: "motivation",
  },
  {
    id: "q03",
    prompt: "What experience do you have working remotely?",
    focus: "remote_experience",
  },
  {
    id: "q04",
    prompt: "How do you organize your daily tasks and meet deadlines while working independently?",
    focus: "organization",
  },
  {
    id: "q05",
    prompt:
      "What motivates you to perform at your best, and how do you stay productive when working remotely?",
    focus: "motivation_productivity",
  },
  {
    id: "q06",
    prompt: "How would you handle multiple urgent tasks at the same time?",
    focus: "prioritization",
  },
  {
    id: "q07",
    prompt:
      "What tools or software are you most comfortable using? (e.g., Google Workspace, Microsoft Office, Slack, Canva, Notion, Trello)",
    focus: "tools",
  },
  {
    id: "q08",
    prompt: "How do you communicate with team members and managers while working remotely?",
    focus: "communication",
  },
  {
    id: "q09",
    prompt:
      "If we gave you this position today, what would your first priority be during your first week?",
    focus: "first_week",
  },
  {
    id: "q10",
    prompt: "How would you handle an unhappy customer or client professionally?",
    focus: "customer_service",
  },
  {
    id: "q11",
    prompt:
      "Are you comfortable learning new software and AI tools? Can you give an example of a new tool you’ve learned quickly?",
    focus: "learning",
  },
  {
    id: "q12",
    prompt: "Why should we hire you over other applicants?",
    focus: "differentiation",
  },
  {
    id: "q13",
    prompt:
      "Describe a situation where you had to learn something completely new in a short amount of time. How did you approach it?",
    focus: "adaptability",
  },
  {
    id: "q14",
    prompt: "Do you have a reliable laptop/computer and stable internet connection for remote work?",
    focus: "equipment",
  },
  {
    id: "q15",
    prompt: "Do you have any questions for us about TradeFlow AI or this position?",
    focus: "candidate_questions",
  },
];

export const CLOSING_ANYTHING_ELSE =
  "Before we conclude the interview, is there anything else you’d like to know about TradeFlow AI or the employment opportunity? We’re happy to answer any questions you may have.";

export const CLOSING_WHATS_YOUR_QUESTION = "What’s your question?";

export const INTERVIEW_COMPLETE_MESSAGE = [
  "Thank you for taking the time to complete your interview.",
  "",
  "We appreciate your interest in joining our team. At this stage, we have all the information we need. If we require any additional details, we’ll reach out to you by email.",
  "",
  "Our team will review your application, and we’ll contact you via email with an update on the next steps. We hope to be in touch with you soon.",
  "",
  "Thank you again, and we wish you the best of luck!",
].join("\n");

export function fillName(template: string, name: string) {
  return template.replaceAll("{{name}}", name);
}

/** Detect yes / affirmative replies for the closing offer. */
export function isAffirmativeReply(text: string) {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  if (/^(yes|yeah|yep|yup|sure|ok|okay|of course|definitely|please|absolutely|i do|i have)([.!?\s]|$)/i.test(t)) {
    return true;
  }
  return /\b(yes|yeah|yep|sure)\b/i.test(t) && !/\b(no|nope|nah|nothing)\b/i.test(t);
}

/** Detect no / decline replies for the closing offer. */
export function isNegativeReply(text: string) {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  if (
    /^(no|nope|nah|nothing|none|no thanks|no thank you|not really|i'm good|im good|all good|that's all|thats all|that is all|i'm fine|im fine)([.!?\s]|$)/i.test(
      t,
    )
  ) {
    return true;
  }
  return /^(no)([,.]?\s|$)/i.test(t);
}

/** Map applicant country to a representative IANA timezone (fallback UTC). */
const COUNTRY_TIMEZONE: Record<string, string> = {
  "United States": "America/New_York",
  "United Kingdom": "Europe/London",
  Canada: "America/Toronto",
  Nigeria: "Africa/Lagos",
  Ghana: "Africa/Accra",
  Kenya: "Africa/Nairobi",
  "South Africa": "Africa/Johannesburg",
  India: "Asia/Kolkata",
  Pakistan: "Asia/Karachi",
  Philippines: "Asia/Manila",
  Australia: "Australia/Sydney",
  Germany: "Europe/Berlin",
  France: "Europe/Paris",
  Brazil: "America/Sao_Paulo",
  Mexico: "America/Mexico_City",
  Remote: "UTC",
};

export function resolveApplicantTimezone(country?: string, timezone?: string) {
  const tz = String(timezone || "").trim();
  if (tz) return tz;
  const c = String(country || "").trim();
  if (c && COUNTRY_TIMEZONE[c]) return COUNTRY_TIMEZONE[c];
  return "UTC";
}

export function timeOfDayGreeting(hour: number) {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

export function buildInterviewGreeting(opts: {
  name?: string;
  country?: string;
  timezone?: string;
  at?: Date;
}) {
  const tz = resolveApplicantTimezone(opts.country, opts.timezone);
  const when = opts.at || new Date();
  let hour = when.getUTCHours();
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    }).formatToParts(when);
    hour = Number(parts.find((p) => p.type === "hour")?.value ?? hour);
  } catch {
    /* keep UTC hour */
  }
  return `${timeOfDayGreeting(hour)}, dear applicant! Welcome to your TradeFlow interview.`;
}

/** Find best knowledge answer from applicant text using tag/keyword overlap. */
export function answerFromKnowledge(userText: string, knowledge = PLATFORM_KNOWLEDGE): string | null {
  const q = userText.toLowerCase();
  if (!q.includes("?") && !/(what|how|where|when|why|who|tell me|explain|pay|role|deposit|tradeflow|job|remote)/i.test(q)) {
    return null;
  }
  let best: KnowledgeEntry | null = null;
  let score = 0;
  for (const entry of knowledge) {
    let s = 0;
    for (const tag of entry.tags) {
      if (q.includes(tag)) s += 2;
    }
    const words = entry.question.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    for (const w of words) if (q.includes(w)) s += 1;
    if (s > score) {
      score = s;
      best = entry;
    }
  }
  if (!best || score < 2) return null;
  return best.answer;
}

export function buildApplicantResume(app: {
  fullName: string;
  email: string;
  phone?: string;
  country: string;
  roleApplied: string;
  experience: string;
  answers: { question: string; answer: string }[];
}) {
  const lines = [
    "TRADEFLOW EMPLOYMENT RESUME (AUTO-GENERATED)",
    "==========================================",
    `Name: ${app.fullName}`,
    `Email: ${app.email}`,
    `Phone: ${app.phone || "—"}`,
    `Country: ${app.country}`,
    `Role applied: ${app.roleApplied}`,
    "",
    "Applicant profile",
    "----------------",
    app.experience || "No portfolio notes provided.",
    "",
    "Interview answers",
    "-----------------",
    ...app.answers.map((a, i) => `Q${i + 1}. ${a.question}\nA${i + 1}. ${a.answer}\n`),
    "",
    "Generated by TradeFlow hiring system.",
  ];
  return lines.join("\n");
}
