"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Briefcase,
  Bot,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageCircleQuestion,
  MapPin,
  MessagesSquare,
  Users,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  UserRoundSearch,
  Settings2,
  Share2,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/lib/auth-store";

export type AdminSection =
  | "dashboard"
  | "withdrawals-email"
  | "wallets"
  | "users"
  | "deposits"
  | "withdrawals"
  | "leads"
  | "applications"
  | "qa"
  | "addresses"
  | "conversation"
  | "configuration"
  | "ai"
  | "social-posts";

const NAV: { id: AdminSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "deposits", label: "Deposits", icon: ArrowDownToLine },
  { id: "withdrawals", label: "Withdrawals", icon: ArrowUpFromLine },
  { id: "wallets", label: "Deposit Wallets", icon: Wallet },
  { id: "withdrawals-email", label: "Withdrawal Emails", icon: Mail },
  { id: "configuration", label: "Configuration", icon: Settings2 },
  { id: "social-posts", label: "Social Posts", icon: Share2 },
  { id: "ai", label: "Interview Bot", icon: Bot },
  { id: "users", label: "Users", icon: Users },
  { id: "leads", label: "Leads", icon: UserRoundSearch },
  { id: "applications", label: "Applications", icon: Briefcase },
  { id: "qa", label: "Q&A", icon: MessageCircleQuestion },
  { id: "addresses", label: "Address", icon: MapPin },
  { id: "conversation", label: "Conversation", icon: MessagesSquare },
];

const TITLES: Record<AdminSection, string> = {
  dashboard: "Dashboard",
  "withdrawals-email": "Withdrawal Emails",
  wallets: "Deposit Wallets",
  users: "Users",
  deposits: "Deposits",
  withdrawals: "Withdrawals",
  leads: "Leads",
  applications: "Job Applications",
  qa: "Q&A",
  addresses: "Address",
  conversation: "Conversation",
  configuration: "Configuration",
  ai: "Interview Bot",
  "social-posts": "Social Posts",
};

function initials(name?: string | null) {
  const parts = String(name || "A").trim().split(/\s+/);
  return ((parts[0]?.[0] || "A") + (parts[1]?.[0] || "")).toUpperCase();
}

export function AdminShell({
  section,
  onSectionChange,
  children,
}: {
  section: AdminSection;
  onSectionChange: (s: AdminSection) => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, clear } = useAuth();
  const [open, setOpen] = useState(false);

  function logout() {
    clear();
    router.push("/");
  }

  function go(id: AdminSection) {
    onSectionChange(id);
    setOpen(false);
  }

  const sidebar = (
    <aside className="flex h-full w-[260px] flex-col border-r border-[var(--line)] bg-[#070d1a]">
      <div className="border-b border-[var(--line)] p-4">
        <BrandLogo href="/admin" size="sm" />
        <p className="mt-2 px-0.5 text-[10px] font-semibold tracking-[0.16em] text-[var(--muted)]">
          ADMIN CONTROL
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-2 text-[10px] font-semibold tracking-[0.16em] text-[var(--muted)]">
          FUNCTIONS
        </p>
        <nav className="space-y-1">
          {NAV.map((item) => {
            const active = section === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  active
                    ? "bg-[var(--blue)] font-semibold text-white shadow-[0_0_20px_rgba(0,163,255,0.35)]"
                    : "text-[var(--muted)] hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="inline-flex items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </span>
                {active ? <span className="text-xs">›</span> : null}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-[var(--line)] p-3">
        <Link
          href="/app"
          className="mb-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--muted)] hover:bg-white/5 hover:text-white"
        >
          Open trader app
        </Link>
        <button
          type="button"
          onClick={logout}
          className="mb-3 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--muted)] hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
        <div className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[rgba(15,26,49,0.65)] p-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--blue)] text-sm font-bold text-white">
            {initials(user?.fullName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Admin</p>
            <p className="truncate text-xs text-[var(--muted)]">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-[#050b18]">
      <div className="hidden lg:block">{sidebar}</div>

      {open ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 h-full">{sidebar}</div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--line)] lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                TradeFlow Admin
              </p>
              <h1 className="text-lg font-semibold">{TITLES[section]}</h1>
            </div>
          </div>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--line)] text-[var(--muted)] lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close"
            hidden={!open}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
