"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronDown,
  Globe2,
  Lock,
  Shield,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { BrandLogo } from "@/components/BrandLogo";
import { ActivityBanner } from "@/components/ActivityBanner";
import { MarketPriceTicker } from "@/components/MarketPriceTicker";
import { BRAND } from "@/lib/constants";

const FEATURES = [
  {
    icon: Zap,
    title: "Lightning Fast",
    body: "AI-powered algorithms execute trades in milliseconds, capturing market opportunities with precision.",
    tone: "blue",
  },
  {
    icon: Shield,
    title: "Bank-Level Security",
    body: "Your funds and data are protected with enterprise-grade encryption and security protocols you can trust.",
    tone: "green",
  },
  {
    icon: Globe2,
    title: "24/7 Trading",
    body: "Our automated systems work around the clock, so you never miss a move while markets are open.",
    tone: "blue",
  },
  {
    icon: Bot,
    title: "Automated Strategies",
    body: "Expertly developed, algorithm-based trading strategies that execute in real time with disciplined risk controls.",
    tone: "green",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    body: "Access real-time performance dashboards and detailed trade analytics to track portfolio progress.",
    tone: "blue",
  },
  {
    icon: Trophy,
    title: "Proven Results",
    body: "Backed by deep market insights and structured session trading. Join traders using TradeFlow AI worldwide.",
    tone: "green",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Create Your Account",
    body: "Sign up in under 2 minutes and you are ready to start on the TradeFlow AI platform.",
  },
  {
    n: "02",
    title: "Fund & Activate",
    body: `Make your first deposit starting from $${BRAND.minInvestment.toLocaleString()}. Activate your desk tools and begin session trading.`,
  },
  {
    n: "03",
    title: "Trade & Earn",
    body: "Watch your balance update as sessions settle. Withdraw profits anytime and scale at your pace.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "TradeFlow AI transformed how I manage sessions. Clear tools, fast deposits, and the desk feels professional.",
    initials: "JO",
    name: "James Okafor",
    role: "Professional Trader, Lagos",
    color: "bg-[#2f7bff]",
  },
  {
    quote:
      "I was careful at first, but the results and support experience speak for themselves. Withdrawals were straightforward.",
    initials: "SM",
    name: "Sofia Martínez",
    role: "Crypto Investor, Madrid",
    color: "bg-[#16a34a]",
  },
  {
    quote:
      "The platform’s market tools and transparency stand out. I’ve tried many desks — TradeFlow AI is cleaner and clearer.",
    initials: "DC",
    name: "David Chen",
    role: "Day Trader, Singapore",
    color: "bg-[#0d9488]",
  },
];

const FAQS = [
  {
    q: "How does the AI trading bot work?",
    a: "TradeFlow AI analyzes live market data and supports session-based strategies with risk controls. Trades run for the duration you select, and losses on a stake are capped at 10%.",
  },
  {
    q: "What is the minimum investment to get started?",
    a: `You can get started with a minimum deposit of $${BRAND.minInvestment.toLocaleString()}. This unlocks the trading desk, live markets, deposits, withdrawals, and 24/7 platform access.`,
  },
  {
    q: "How do withdrawals work?",
    a: "Submit a withdrawal with your coin, network, and wallet address. Requests are reviewed and typically processed within 24–72 hours. Status updates are emailed as they change.",
  },
  {
    q: "Is my investment safe?",
    a: "We use encrypted sessions, secure authentication, and protected account workflows. Always use strong passwords and enable verification codes. Trading involves risk — never invest more than you can afford to lose.",
  },
  {
    q: "Which countries are supported?",
    a: "TradeFlow AI accepts registrations from all countries. A small number of jurisdictions may face additional compliance checks. Contact support if you need eligibility help.",
  },
];

function toneClass(tone: string) {
  return tone === "green" ? "text-[var(--green)] border-[rgba(34,197,94,0.35)]" : "text-[var(--blue)] border-[rgba(0,163,255,0.35)]";
}

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <ActivityBanner />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_400px_at_50%_20%,rgba(0,163,255,0.16),transparent_60%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-2 lg:items-center lg:py-16">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.08)] px-3 py-1 text-xs font-medium tracking-wide text-[var(--green)]">
              <span className="h-2 w-2 animate-[pulse-dot_1.6s_ease_infinite] rounded-full bg-[var(--green)]" />
              MARKETS ARE OPEN · AI IS LIVE
            </div>
            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Grow Your Capital{" "}
              <span className="bg-gradient-to-r from-[#00A3FF] to-[#22C55E] bg-clip-text text-transparent">
                With AI
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-[var(--muted)] sm:text-lg">
              Join traders using TradeFlow AI for live markets, session trading, deposits, and withdrawals —
              with tools built for speed and clarity.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/auth/signup" className="tf-btn tf-btn-primary tf-glow !rounded-xl">
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/auth/login" className="tf-btn tf-btn-ghost !rounded-xl">
                Sign In
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--muted)]">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-[var(--green)]" /> Bank-level security
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-[var(--blue)]" /> 94.2% win rate
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Globe2 className="h-4 w-4 text-[var(--blue)]" /> 140+ countries
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08 }}
            className="tf-card relative p-5 shadow-[0_0_40px_rgba(0,163,255,0.12)]"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-[rgba(0,163,255,0.35)] text-[var(--blue)]">
                  <Bot className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">TradeFlow AI Engine</p>
                  <p className="text-xs text-[var(--green)]">● LIVE</p>
                </div>
              </div>
              <div className="text-right">
                <p className="rounded-full bg-[rgba(34,197,94,0.12)] px-2 py-0.5 text-[10px] font-semibold text-[var(--green)]">
                  AVG RETURN +340%
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">WIN RATE</p>
                <p className="text-2xl font-bold text-[var(--green)]">94.2%</p>
              </div>
            </div>

            <p className="text-xs tracking-wider text-[var(--muted)]">TODAY&apos;S P/L</p>
            <div className="mt-1 flex flex-wrap items-end gap-2">
              <p className="text-3xl font-bold text-white">+$4,287.50</p>
              <span className="rounded-md bg-[rgba(34,197,94,0.15)] px-2 py-0.5 text-xs text-[var(--green)]">+12.4%</span>
            </div>

            <div className="mt-4 h-24 rounded-xl bg-[rgba(0,163,255,0.08)] p-3">
              <svg viewBox="0 0 300 80" className="h-full w-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="tfChart" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00A3FF" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#00A3FF" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 60 C40 50 60 70 90 45 C120 20 150 35 180 25 C220 10 250 30 300 8 L300 80 L0 80 Z" fill="url(#tfChart)" />
                <path d="M0 60 C40 50 60 70 90 45 C120 20 150 35 180 25 C220 10 250 30 300 8" fill="none" stroke="#00A3FF" strokeWidth="3" />
              </svg>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              {[
                ["BUY", "BTC/USD", "+$842", "text-[var(--green)]", "bg-[rgba(34,197,94,0.15)] text-[var(--green)]"],
                ["SELL", "ETH/USD", "+$314", "text-[var(--red)]", "bg-[rgba(239,68,68,0.15)] text-[var(--red)]"],
                ["BUY", "SOL/USD", "+$127", "text-[var(--green)]", "bg-[rgba(34,197,94,0.15)] text-[var(--green)]"],
              ].map(([side, pair, pnl, pnlColor, badge]) => (
                <div key={pair} className="flex items-center justify-between rounded-xl border border-[var(--line)] px-3 py-2.5">
                  <span className="inline-flex items-center gap-2">
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${badge}`}>{side}</span>
                    {pair}
                  </span>
                  <span className={pnlColor}>{pnl}</span>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs text-[var(--muted)]">
                <span>Sessions completed today</span>
                <span>128 / 150</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
                <div className="h-full w-[85%] rounded-full bg-[var(--blue)]" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <MarketPriceTicker />

      {/* STATS */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["15,344+", "ACTIVE USERS", "text-[var(--blue)]", Globe2],
            ["700%", "MAX PROFIT", "text-[var(--green)]", BarChart3],
            ["24/7", "MARKET MONITORING", "text-[var(--blue)]", Zap],
            [`$${BRAND.minInvestment.toLocaleString()}`, "MIN INVESTMENT", "text-[var(--green)]", Sparkles],
          ].map(([value, label, color, Icon]) => (
            <div key={String(label)} className="tf-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className={`text-3xl font-bold ${color}`}>{value as string}</p>
                <Icon className={`h-5 w-5 ${color as string}`} />
              </div>
              <div className={`mb-2 h-1 w-12 rounded-full ${String(color).includes("green") ? "bg-[var(--green)]" : "bg-[var(--blue)]"}`} />
              <p className="text-xs tracking-[0.14em] text-[var(--muted)]">{label as string}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <span className="inline-flex rounded-full border border-[rgba(0,163,255,0.35)] px-3 py-1 text-xs text-[var(--blue)]">
              About Us
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Discover Our Platform — Don&apos;t Miss Out
              <span className="mt-2 block h-1 w-16 rounded-full bg-[var(--blue)]" />
            </h2>
            <p className="mt-4 text-[var(--muted)]">
              Trade smarter with AI-driven market tools on TradeFlow AI. Our platform combines live data,
              session trading, and an intuitive interface so you can deposit, trade, and withdraw with clarity.
            </p>
            <ul className="mt-6 space-y-4">
              <li className="flex gap-3">
                <span className="mt-1 grid h-6 w-6 place-items-center rounded-full bg-[rgba(0,163,255,0.15)] text-[var(--blue)]">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold">Auto-Trading Services</p>
                  <p className="text-sm text-[var(--muted)]">Harness algorithms that execute sessions with defined duration and stake risk limits.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 grid h-6 w-6 place-items-center rounded-full bg-[rgba(0,163,255,0.15)] text-[var(--blue)]">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold">Years of Market Focus</p>
                  <p className="text-sm text-[var(--muted)]">Built for crypto and cross-market pairs with continuous monitoring around the clock.</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            {[
              {
                title: "AI-Powered Returns",
                pct: "88%",
                width: "88%",
                body: "Machine-assisted tools designed to support traders pursuing strong performance with disciplined session controls.",
              },
              {
                title: "Market Coverage",
                pct: "94%",
                width: "94%",
                body: "150+ crypto and forex-style pairs available with live pricing and watchlist-ready market views.",
              },
              {
                title: "Trader Success Rate",
                pct: "87%",
                width: "87%",
                body: "Active traders using TradeFlow AI tools to structure sessions and track wins, losses, and portfolio progress.",
              },
            ].map((card) => (
              <div key={card.title} className="tf-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{card.title}</p>
                  <p className="text-xl font-bold text-[var(--blue)]">{card.pct}</p>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[var(--blue)]" style={{ width: card.width }} />
                </div>
                <p className="mt-3 text-sm text-[var(--muted)]">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="scroll-mt-24 border-y border-[var(--line)] bg-[rgba(0,0,0,0.25)] py-16">
        <div className="mx-auto max-w-6xl px-4">
          <span className="mx-auto mb-3 flex w-fit rounded-full border border-[rgba(0,163,255,0.35)] px-3 py-1 text-xs text-[var(--blue)]">
            Why Choose Us
          </span>
          <h2 className="text-center text-3xl font-bold sm:text-4xl">
            Why Choose <span className="text-[var(--blue)]">TradeFlow AI</span>?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[var(--muted)]">
            Experience a modern trading platform with cutting-edge features designed for your success.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="tf-card p-5">
                <span className={`mb-3 grid h-10 w-10 place-items-center rounded-xl border ${toneClass(f.tone)}`}>
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16">
        <span className="mx-auto mb-3 flex w-fit rounded-full border border-[rgba(0,163,255,0.35)] px-3 py-1 text-xs text-[var(--blue)]">
          How It Works
        </span>
        <h2 className="text-center text-3xl font-bold sm:text-4xl">
          Start Trading in <span className="text-[var(--blue)]">3 Simple Steps</span>
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-[var(--muted)]">
          Getting started with TradeFlow AI is fast and straightforward. Be live in minutes.
        </p>

        <div className="relative mt-12 grid gap-8 md:grid-cols-3">
          <div className="pointer-events-none absolute left-[16%] right-[16%] top-7 hidden h-px bg-[rgba(0,163,255,0.25)] md:block" />
          {STEPS.map((s) => (
            <div key={s.n} className="relative text-center">
              <div className="relative z-10 mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-[rgba(0,163,255,0.4)] bg-[var(--bg-card)] text-lg font-bold text-[var(--blue)] shadow-[0_0_24px_rgba(0,163,255,0.25)]">
                {s.n}
              </div>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link href="/auth/signup" className="tf-btn tf-btn-primary tf-glow !rounded-xl">
            Create Free Account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="border-y border-[var(--line)] bg-[rgba(0,0,0,0.2)] py-16">
        <div className="mx-auto max-w-6xl px-4">
          <span className="mx-auto mb-3 flex w-fit rounded-full border border-[rgba(0,163,255,0.35)] px-3 py-1 text-xs text-[var(--blue)]">
            Testimonials
          </span>
          <h2 className="text-center text-3xl font-bold sm:text-4xl">
            What Our <span className="text-[var(--blue)]">Traders</span> Say
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[var(--muted)]">
            Join thousands of traders building with TradeFlow AI across global markets.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="tf-card flex flex-col p-5">
                <div className="mb-3 flex gap-1 text-[var(--blue)]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i}>★</span>
                  ))}
                </div>
                <p className="flex-1 text-sm leading-relaxed text-white/90">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-5 flex items-center gap-3 border-t border-[var(--line)] pt-4">
                  <span className={`grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-white ${t.color}`}>
                    {t.initials}
                  </span>
                  <div>
                    <p className="inline-flex items-center gap-1 font-semibold">
                      {t.name}
                      <CheckCircle2 className="h-4 w-4 text-[var(--blue)]" />
                    </p>
                    <p className="text-xs text-[var(--muted)]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16">
        <span className="mx-auto mb-3 flex w-fit rounded-full border border-[rgba(0,163,255,0.35)] px-3 py-1 text-xs text-[var(--blue)]">
          FAQ
        </span>
        <h2 className="text-center text-3xl font-bold sm:text-4xl">
          Frequently Asked <span className="text-[var(--blue)]">Questions</span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-[var(--muted)]">
          Everything you need to know about TradeFlow AI. Can&apos;t find the answer? Contact our support team.
        </p>
        <div className="mt-8 space-y-3">
          {FAQS.map((item, idx) => {
            const open = openFaq === idx;
            return (
              <div
                key={item.q}
                className={`tf-card overflow-hidden ${open ? "border-[rgba(0,163,255,0.45)] bg-[rgba(0,163,255,0.06)]" : ""}`}
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left font-medium"
                  onClick={() => setOpenFaq(open ? -1 : idx)}
                >
                  {item.q}
                  <ChevronDown className={`h-5 w-5 shrink-0 text-[var(--blue)] transition ${open ? "rotate-180" : ""}`} />
                </button>
                {open ? <p className="px-4 pb-4 text-sm leading-relaxed text-[var(--muted)]">{item.a}</p> : null}
              </div>
            );
          })}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden border-t border-[var(--line)] py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_300px_at_50%_40%,rgba(0,163,255,0.18),transparent_65%)]" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(34,197,94,0.35)] px-3 py-1 text-xs text-[var(--green)]">
            <span className="h-2 w-2 rounded-full bg-[var(--green)]" />
            MARKETS ARE OPEN · AI IS LIVE
          </div>
          <h2 className="text-3xl font-bold sm:text-4xl">
            Ready to Start{" "}
            <span className="bg-gradient-to-r from-[#00A3FF] to-[#22C55E] bg-clip-text text-transparent">
              Trading?
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[var(--muted)]">
            Join traders already building portfolios with TradeFlow AI.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/auth/signup" className="tf-btn tf-btn-primary tf-glow !rounded-xl">
              Create Free Account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/auth/login" className="tf-btn tf-btn-ghost !rounded-xl">
              Sign In
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-5 text-sm">
            <span className="inline-flex items-center gap-1.5 text-[var(--green)]">
              <Lock className="h-4 w-4" /> No credit card to sign up
            </span>
            <span className="inline-flex items-center gap-1.5 text-[var(--blue)]">
              <Sparkles className="h-4 w-4" /> Start with ${BRAND.minInvestment.toLocaleString()}
            </span>
          </div>
        </div>
      </section>

      {/* CONTACT / FOOTER */}
      <footer id="contact" className="scroll-mt-24 border-t border-[var(--line)] bg-black/40 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 md:flex-row md:justify-between">
          <div>
            <BrandLogo />
            <p className="mt-3 max-w-sm text-sm text-[var(--muted)]">
              TradeFlow AI — professional crypto trading platform with live markets, deposits, withdrawals, and AI-assisted session tools.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div>
              <p className="mb-2 font-semibold">Product</p>
              <div className="flex flex-col gap-2 text-[var(--muted)]">
                <a href="#features">Features</a>
                <a href="#how-it-works">How It Works</a>
                <Link href="/careers">Careers</Link>
              </div>
            </div>
            <div>
              <p className="mb-2 font-semibold">Account</p>
              <div className="flex flex-col gap-2 text-[var(--muted)]">
                <Link href="/auth/login">Sign In</Link>
                <Link href="/auth/signup">Get Started</Link>
              </div>
            </div>
            <div>
              <p className="mb-2 font-semibold">Support</p>
              <div className="flex flex-col gap-2 text-[var(--muted)]">
                <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>
                <span>Available 24/7</span>
              </div>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-6xl px-4 text-xs text-[var(--muted)]">
          © {new Date().getFullYear()} TradeFlow AI. Trading involves risk. Past performance does not guarantee future results.
        </p>
      </footer>
    </div>
  );
}
