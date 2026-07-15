import { error, json } from "@/lib/api";
import {
  EMPLOYMENT_ROLES,
  getStore,
  interviewQuestions,
  markApplicantMessagesSeen,
  normalizeChatAttachments,
  enqueueAdminQa,
  enqueueAdminAddress,
  looksLikeApplicantQuestion,
  looksLikeShippingAddress,
  ADMIN_QA_FORWARDED,
  processRecruitmentBot,
  pushInterviewMessage,
  recruitTimingMs,
  scheduleApplicationInterview,
  scheduleInterviewApprovalEmail,
  scheduleInterviewAt,
  seedInterviewConversation,
  uid,
  receiveApplicantMail,
  listMailMessagesForApplication,
} from "@/lib/demo-store";
import {
  answerFromKnowledge,
  CLOSING_ANYTHING_ELSE,
  CLOSING_WHATS_YOUR_QUESTION,
  fillName,
  INTERVIEW_COMPLETE_MESSAGE,
  isAffirmativeReply,
  isNegativeReply,
} from "@/lib/recruitment-knowledge";

function completeInterviewAndClose(
  store: ReturnType<typeof getStore>,
  app: NonNullable<ReturnType<typeof getStore>["applications"][number]>,
  id: string,
) {
  pushInterviewMessage(id, "assistant", INTERVIEW_COMPLETE_MESSAGE);
  app.status = "interview_complete";
  app.chatPhase = "awaiting_feedback";
  app.interviewCompletedAt = new Date().toISOString();
  scheduleInterviewApprovalEmail(app, 30 * 60 * 1000);
  store.hiringAlerts.unshift({
    id: uid("halert"),
    applicationId: app.id,
    kind: "interview_complete",
    message: `${app.fullName} completed the interview. Approval email scheduled in 30 minutes.`,
    createdAt: new Date().toISOString(),
    read: false,
  });
}

const ADDRESS_PROMPT =
  "Please reply with your full home address (street, city, state/province, postal code, country) so the company can send your $1,500 first trading deposit.";

const ONBOARDING_HELP =
  "Thanks — your address was shared with the hiring team for the $1,500 first trading deposit. Next, set up on TradeFlow: create/login at the trader dashboard, fund your wallet when instructed, explore AI trading sessions, and use this chat anytime for platform or employment questions.";

function publicApp(app: {
  id: string;
  fullName: string;
  email: string;
  country: string;
  phone: string;
  experience: string;
  roleApplied: string;
  status: string;
  interviewAt: string;
  createdAt: string;
  confirmSendAt: string;
  confirmSentAt?: string;
  interviewStartedAt?: string;
  interviewCompletedAt?: string;
  interviewQuestionIndex: number;
  missedCount: number;
  chatPhase: string;
  approvalEmailSendAt?: string;
  approvalEmailSentAt?: string;
  acknowledgedAt?: string;
  shippingAddress?: string;
  resumeText?: string;
}) {
  return {
    id: app.id,
    fullName: app.fullName,
    email: app.email,
    country: app.country,
    phone: app.phone,
    experience: app.experience,
    roleApplied: app.roleApplied,
    status: app.status,
    interviewAt: app.interviewAt,
    createdAt: app.createdAt,
    confirmSendAt: app.confirmSendAt,
    confirmSentAt: app.confirmSentAt,
    interviewStartedAt: app.interviewStartedAt,
    interviewCompletedAt: app.interviewCompletedAt,
    interviewQuestionIndex: app.interviewQuestionIndex,
    missedCount: app.missedCount,
    chatPhase: app.chatPhase,
    approvalEmailSendAt: app.approvalEmailSendAt,
    approvalEmailSentAt: app.approvalEmailSentAt,
    acknowledgedAt: app.acknowledgedAt,
    shippingAddress: app.shippingAddress ? "[on file]" : undefined,
    hasResume: Boolean(app.resumeText),
  };
}

export async function GET(req: Request) {
  processRecruitmentBot();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const token = searchParams.get("ackToken");
  const store = getStore();

  if (token) {
    const app = store.applications.find((a) => a.ackToken === token);
    if (!app) return error("Invalid acknowledgment link", 404);
    return json({
      application: publicApp(app),
      acknowledged: Boolean(app.acknowledgedAt),
    });
  }

  if (!id) {
    return json({
      applications: store.applications.map(publicApp),
      aiRecruitment: store.aiRecruitment,
      knowledgeBase: store.knowledgeBase,
      recruitBotOutbox: store.recruitBotOutbox.slice(0, 40),
    });
  }
  const app = store.applications.find((a) => a.id === id);
  if (!app) return error("Not found", 404);
  const messages = store.interviewMessages[id] || [];
  const botMessages = store.recruitBotOutbox.filter((m) => m.applicationId === id);
  return json({
    application: publicApp(app),
    messages,
    botMessages,
    canStart:
      Date.now() >= new Date(app.interviewAt).getTime() - 60_000 || Boolean(app.interviewStartedAt),
  });
}

export async function POST(req: Request) {
  processRecruitmentBot();
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "apply");
  const store = getStore();

  if (action === "apply") {
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const country = String(body.country || "").trim();
    const phone = String(body.phone || "").trim();
    const experience = String(body.experience || "").trim();
    const roleApplied = String(body.roleApplied || "").trim();
    const allowed = EMPLOYMENT_ROLES.map((r) => r.title);
    if (!fullName || !email || !country) return error("Name, email and country required");
    if (!allowed.includes(roleApplied as (typeof allowed)[number])) {
      return error(`Select a role: ${allowed.join(", ")}`);
    }

    const now = Date.now();
    const timing = recruitTimingMs(store.aiRecruitment);
    const interviewAt = scheduleInterviewAt(now, timing.interviewMs);
    const confirmSendAt = new Date(now + timing.replyMs).toISOString();
    const app = {
      id: uid("app"),
      fullName,
      email,
      country,
      phone,
      experience,
      roleApplied,
      status: "interview_scheduled",
      interviewAt,
      createdAt: new Date(now).toISOString(),
      confirmSendAt,
      interviewQuestionIndex: 0,
      missedCount: 0,
      chatPhase: "interview" as const,
    };
    store.applications.unshift(app);
    scheduleApplicationInterview(app);

    const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
    return json({
      application: publicApp(app),
      message:
        "Application received. We'll email you shortly with your interview details. Check your inbox for confirmation.",
      schedule: {
        replyAfterApplyMinutes: store.aiRecruitment.replyAfterApplyMinutes,
        interviewAfterApplyMinutes: store.aiRecruitment.interviewAfterApplyMinutes,
        interviewAt,
        confirmSendAt,
        interviewLink: `${base}/careers/interview/${app.id}`,
      },
    });
  }

  if (action === "tick") {
    const flushed = processRecruitmentBot();
    const id = String(body.id || "");
    const app = id ? store.applications.find((a) => a.id === id) : null;
    const botMessages = id
      ? store.recruitBotOutbox.filter((m) => m.applicationId === id)
      : store.recruitBotOutbox.slice(0, 20);
    return json({
      flushed: flushed.length,
      application: app ? publicApp(app) : null,
      botMessages,
      messages: id ? store.interviewMessages[id] || [] : [],
    });
  }

  /** Applicant demo mailbox — read hiring emails + reply. */
  if (action === "mail-inbox") {
    const id = String(body.id || "").trim();
    const app = store.applications.find((a) => a.id === id);
    if (!app) return error("Application not found", 404);
    const threads = store.adminMailThreads
      .filter((t) => t.applicationId === id)
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
    return json({
      application: publicApp(app),
      threads,
      messages: listMailMessagesForApplication(id),
      mailboxLink: `/careers/mailbox/${id}`,
    });
  }

  if (action === "mail-reply") {
    const id = String(body.id || "").trim();
    const threadId = String(body.threadId || "").trim() || undefined;
    const subject = String(body.subject || "").trim() || undefined;
    const content = String(body.content || body.body || "").trim();
    const result = receiveApplicantMail({
      applicationId: id,
      threadId,
      subject,
      body: content,
    });
    if (!result.ok) return error(result.error, 400);
    return json({
      ok: true,
      thread: result.thread,
      message: result.message,
      threads: store.adminMailThreads.filter((t) => t.applicationId === id),
      messages: listMailMessagesForApplication(id),
    });
  }

  /** Open a live AI DM chat immediately (no waiting room). */
  if (action === "open-dm") {
    const timezone = String(body.timezone || "").trim();
    const existingId = String(body.id || "").trim();
    if (existingId) {
      const existing = store.applications.find((a) => a.id === existingId);
      if (existing) {
        existing.interviewStartedAt = existing.interviewStartedAt || new Date().toISOString();
        existing.status =
          existing.status === "interview_scheduled" || existing.status === "missed"
            ? "interviewing"
            : existing.status;
        store.interviewMessages[existingId] ??= [];
        if (!store.interviewMessages[existingId].length) {
          seedInterviewConversation(existingId, existing, timezone);
        }
        return json({
          application: publicApp(existing),
          messages: store.interviewMessages[existingId],
          chatLink: `/careers/interview/${existing.id}`,
        });
      }
    }

    const now = Date.now();
    const fullName = String(body.fullName || "Guest Applicant").trim() || "Guest Applicant";
    const email = String(body.email || `guest_${uid("mail")}@tradeflow.demo`).trim().toLowerCase();
    const roleApplied = String(body.roleApplied || EMPLOYMENT_ROLES[0].title);
    const app = {
      id: uid("app"),
      fullName,
      email,
      country: String(body.country || "Remote").trim() || "Remote",
      phone: String(body.phone || "").trim(),
      experience: String(body.experience || "Opened AI chat DM").trim(),
      roleApplied: EMPLOYMENT_ROLES.some((r) => r.title === roleApplied)
        ? roleApplied
        : EMPLOYMENT_ROLES[0].title,
      status: "interviewing",
      interviewAt: new Date(now).toISOString(),
      createdAt: new Date(now).toISOString(),
      confirmSendAt: new Date(now).toISOString(),
      confirmSentAt: new Date(now).toISOString(),
      interviewStartedAt: new Date(now).toISOString(),
      interviewQuestionIndex: 0,
      missedCount: 0,
      chatPhase: "interview" as const,
    };
    store.applications.unshift(app);
    seedInterviewConversation(app.id, app, timezone);
    const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
    return json({
      application: publicApp(app),
      messages: store.interviewMessages[app.id],
      chatLink: `${base}/careers/interview/${app.id}`,
      message: "AI chat ready",
    });
  }

  if (action === "acknowledge") {
    const token = String(body.token || body.ackToken || "").trim();
    const app = store.applications.find((a) => a.ackToken === token);
    if (!app) return error("Invalid acknowledgment link", 404);
    if (!app.acknowledgedAt) {
      app.acknowledgedAt = new Date().toISOString();
      app.status = "acknowledged";
      app.chatPhase = "awaiting_address";
      store.hiringAlerts.unshift({
        id: uid("halert"),
        applicationId: app.id,
        kind: "acknowledged",
        message: `${app.fullName} acknowledged their approved application.`,
        createdAt: new Date().toISOString(),
        read: false,
      });
      pushInterviewMessage(
        app.id,
        "assistant",
        `Thanks for acknowledging your approval, ${app.fullName.split(/\s+/)[0] || "there"}. ${ADDRESS_PROMPT}`,
      );
    }
    return json({
      ok: true,
      application: publicApp(app),
      messages: store.interviewMessages[app.id] || [],
      interviewLink: `/careers/interview/${app.id}`,
      message: "Acknowledgment received. Continue in chat to share your shipping address.",
    });
  }

  if (action === "start-interview" || action === "chat") {
    const id = String(body.id || "");
    const app = store.applications.find((a) => a.id === id);
    if (!app) return error("Application not found", 404);

    store.interviewMessages[id] ??= [];
    const questions = interviewQuestions(store);
    const firstName = app.fullName.trim().split(/\s+/)[0] || "there";

    if (action === "start-interview") {
      const early = body.forceEarly === true;
      const timezone = String(body.timezone || "").trim();
      const readyAt = new Date(app.interviewAt).getTime();
      const postInterview =
        app.interviewStartedAt ||
        ["interview_complete", "approved_pending_ack", "acknowledged", "address_collected", "onboarding", "approved"].includes(
          app.status,
        ) ||
        [
          "awaiting_feedback",
          "awaiting_ack",
          "awaiting_address",
          "onboarding",
          "closing_offer",
          "closing_awaiting_question",
        ].includes(app.chatPhase);

      if (!early && !postInterview && Date.now() < readyAt - 60_000) {
        return json({
          application: publicApp(app),
          messages: store.interviewMessages[id],
          botMessages: store.recruitBotOutbox.filter((m) => m.applicationId === id),
          waiting: true,
          message: `Interview opens at ${new Date(app.interviewAt).toLocaleString()}. Check your email for the interview chat link.`,
        });
      }

      if (!app.interviewStartedAt && app.chatPhase === "interview") {
        app.status = "interviewing";
        app.interviewStartedAt = new Date().toISOString();
        app.chatPhase = "interview";
        if (!store.interviewMessages[id].length) {
          seedInterviewConversation(id, app, timezone);
        }
      }

      return json({
        application: publicApp(app),
        messages: store.interviewMessages[id],
        botMessages: store.recruitBotOutbox.filter((m) => m.applicationId === id),
        waiting: false,
      });
    }

    // chat
    if (!app.interviewStartedAt && app.chatPhase === "interview") {
      return error("Interview has not started yet");
    }

    const phase = app.chatPhase || "interview";

    /** Interview concluded — composer locked, no further messages. */
    if (phase === "awaiting_feedback") {
      return error("This interview chat is closed. Please wait for an email update on next steps.");
    }

    const content = String(body.content || "").trim();
    const attachments = normalizeChatAttachments(body.attachments);
    if (!content && !attachments.length) return error("Message or file required");
    pushInterviewMessage(id, "applicant", content || (attachments.length ? "Sent an attachment" : ""), {
      attachments,
      status: "sent",
    });

    if (phase === "awaiting_address") {
      if (!content) {
        return json({
          application: publicApp(app),
          messages: store.interviewMessages[id],
          botMessages: store.recruitBotOutbox.filter((m) => m.applicationId === id),
        });
      }
      app.shippingAddress = content;
      app.addressSubmittedAt = new Date().toISOString();
      app.status = "address_collected";
      app.chatPhase = "onboarding";
      enqueueAdminAddress(app, content);
      markApplicantMessagesSeen(id);
      pushInterviewMessage(id, "assistant", ONBOARDING_HELP);
      return json({
        application: publicApp(app),
        messages: store.interviewMessages[id],
        botMessages: store.recruitBotOutbox.filter((m) => m.applicationId === id),
      });
    }

    // Auto-detect address outside interview Q&A (e.g. after ack / onboarding / closing)
    if (
      content &&
      looksLikeShippingAddress(content) &&
      phase !== "awaiting_feedback" &&
      phase !== "awaiting_address"
    ) {
      if (!app.shippingAddress) {
        app.shippingAddress = content;
        app.addressSubmittedAt = new Date().toISOString();
      }
      if (["acknowledged", "approved_pending_ack", "interview_complete"].includes(app.status)) {
        app.status = "address_collected";
      }
      if (phase === "awaiting_ack") app.chatPhase = "onboarding";
      enqueueAdminAddress(app, content);
      // During active interview, keep going through Q&A below — only short-circuit for post-interview chat
      if (phase !== "interview" && phase !== "closing_offer" && phase !== "closing_awaiting_question") {
        markApplicantMessagesSeen(id);
        pushInterviewMessage(
          id,
          "assistant",
          "Thanks — I’ve captured your address for our hiring team. You’ll get a follow-up message here once they confirm.",
        );
        return json({
          application: publicApp(app),
          messages: store.interviewMessages[id],
          botMessages: store.recruitBotOutbox.filter((m) => m.applicationId === id),
        });
      }
    }

    if (phase === "onboarding" || phase === "awaiting_ack") {
      const kb = answerFromKnowledge(content, store.knowledgeBase);
      if (looksLikeApplicantQuestion(content)) {
        markApplicantMessagesSeen(id);
        if (kb) {
          pushInterviewMessage(id, "assistant", kb);
        } else {
          enqueueAdminQa(app, content);
          pushInterviewMessage(id, "assistant", ADMIN_QA_FORWARDED);
        }
        return json({
          application: publicApp(app),
          messages: store.interviewMessages[id],
          botMessages: store.recruitBotOutbox.filter((m) => m.applicationId === id),
        });
      }
      let reply =
        kb ||
        (phase === "awaiting_ack"
          ? "Your application was approved. Please open the acknowledgment link in your email, then return here."
          : attachments.length
            ? "Thanks for sharing that file. Happy to help with platform setup — ask about deposits, AI trading, withdrawals, or your role."
            : "Happy to help with platform setup. Ask about deposits, AI trading, withdrawals, or your role. Or register/login from the main TradeFlow dashboard.");
      markApplicantMessagesSeen(id);
      pushInterviewMessage(id, "assistant", reply);
      return json({
        application: publicApp(app),
        messages: store.interviewMessages[id],
        botMessages: store.recruitBotOutbox.filter((m) => m.applicationId === id),
      });
    }

    /** After last interview answer: ask / loop closing questions until applicant declines. */
    if (phase === "closing_offer" || phase === "closing_awaiting_question") {
      markApplicantMessagesSeen(id);

      if (content && looksLikeShippingAddress(content)) {
        enqueueAdminAddress(app, content);
        pushInterviewMessage(
          id,
          "assistant",
          "Thanks — I’ve captured your address for our hiring team.",
        );
        app.chatPhase = "closing_offer";
        pushInterviewMessage(id, "assistant", CLOSING_ANYTHING_ELSE);
        return json({
          application: publicApp(app),
          messages: store.interviewMessages[id],
          botMessages: store.recruitBotOutbox.filter((m) => m.applicationId === id),
        });
      }

      if (phase === "closing_offer") {
        if (isNegativeReply(content)) {
          completeInterviewAndClose(store, app, id);
        } else if (isAffirmativeReply(content)) {
          app.chatPhase = "closing_awaiting_question";
          pushInterviewMessage(id, "assistant", CLOSING_WHATS_YOUR_QUESTION);
        } else {
          const kb = answerFromKnowledge(content, store.knowledgeBase);
          if (looksLikeApplicantQuestion(content)) {
            if (kb) {
              pushInterviewMessage(id, "assistant", kb);
            } else {
              enqueueAdminQa(app, content);
              pushInterviewMessage(id, "assistant", ADMIN_QA_FORWARDED);
            }
            pushInterviewMessage(id, "assistant", CLOSING_ANYTHING_ELSE);
          } else if (kb) {
            pushInterviewMessage(id, "assistant", kb);
            pushInterviewMessage(id, "assistant", CLOSING_ANYTHING_ELSE);
          } else {
            pushInterviewMessage(
              id,
              "assistant",
              `Please reply with yes if you have a question, or no if you’re ready to finish.\n\n${CLOSING_ANYTHING_ELSE}`,
            );
          }
        }
      } else {
        // closing_awaiting_question
        if (isNegativeReply(content)) {
          completeInterviewAndClose(store, app, id);
        } else if (isAffirmativeReply(content)) {
          pushInterviewMessage(id, "assistant", CLOSING_WHATS_YOUR_QUESTION);
        } else {
          const kb = answerFromKnowledge(content, store.knowledgeBase);
          if (kb) {
            pushInterviewMessage(id, "assistant", kb);
          } else {
            enqueueAdminQa(app, content);
            pushInterviewMessage(id, "assistant", ADMIN_QA_FORWARDED);
          }
          app.chatPhase = "closing_offer";
          pushInterviewMessage(id, "assistant", CLOSING_ANYTHING_ELSE);
        }
      }

      return json({
        application: publicApp(app),
        messages: store.interviewMessages[id],
        botMessages: store.recruitBotOutbox.filter((m) => m.applicationId === id),
      });
    }

    // Active interview Q&A
    const kb = answerFromKnowledge(content, store.knowledgeBase);
    if (content && looksLikeShippingAddress(content)) {
      if (!app.shippingAddress) {
        app.shippingAddress = content;
        app.addressSubmittedAt = new Date().toISOString();
      }
      enqueueAdminAddress(app, content);
    }
    if (looksLikeApplicantQuestion(content) && !looksLikeShippingAddress(content)) {
      markApplicantMessagesSeen(id);
      if (kb) {
        pushInterviewMessage(id, "assistant", kb);
      } else {
        enqueueAdminQa(app, content);
        pushInterviewMessage(id, "assistant", ADMIN_QA_FORWARDED);
      }
    } else if (kb && /\?|what|how|pay|deposit|tradeflow|role|job|remote|salary|week/i.test(content)) {
      markApplicantMessagesSeen(id);
      pushInterviewMessage(id, "assistant", kb);
    }

    const qIndex = app.interviewQuestionIndex ?? 0;
    const nextIndex = qIndex + 1;
    app.interviewQuestionIndex = nextIndex;

    markApplicantMessagesSeen(id);
    if (nextIndex >= questions.length) {
      app.chatPhase = "closing_offer";
      pushInterviewMessage(id, "assistant", CLOSING_ANYTHING_ELSE);
    } else {
      pushInterviewMessage(id, "assistant", fillName(questions[nextIndex], firstName));
    }

    return json({
      application: publicApp(app),
      messages: store.interviewMessages[id],
      botMessages: store.recruitBotOutbox.filter((m) => m.applicationId === id),
    });
  }

  return error("Unknown action");
}
