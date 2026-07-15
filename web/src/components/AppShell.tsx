"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bell,
  Bot,
  LayoutDashboard,
  LogOut,
  Menu,
  UserRound,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { ActivityBanner } from "@/components/ActivityBanner";
import { apiFetch, useAuth } from "@/lib/auth-store";

const NAV = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/app/deposit", label: "Deposit", icon: ArrowDownToLine },
  { href: "/app/withdraw", label: "Withdraw", icon: ArrowUpFromLine },
  { href: "/app/trade", label: "AI Bot", icon: Bot },
  { href: "/app/profile", label: "Profile", icon: UserRound },
];

function initials(name?: string | null) {
  const parts = String(name || "U").trim().split(/\s+/);
  return ((parts[0]?.[0] || "U") + (parts[1]?.[0] || "")).toUpperCase();
}

export function AppShell({
  title = "Dashboard",
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, user, clear, updateUser } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!token) router.replace("/auth/login");
  }, [token, router]);

  // Keep settling active trades while user browses any app page (or briefly after leaving trade)
  useEffect(() => {
    if (!token) return;
    let alive = true;
    async function tick() {
      try {
        const data = await apiFetch<{ user: { balanceUsd: number } }>("/api/me", { token });
        if (alive) updateUser({ balanceUsd: data.user.balanceUsd });
      } catch {
        /* ignore */
      }
    }
    tick();
    const t = setInterval(tick, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [token, updateUser]);

  function logout() {
    clear();
    router.push("/");
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  if (!token) {
    return <div className="grid min-h-screen place-items-center text-[var(--muted)]">Loading…</div>;
  }

  const sidebar = (
    <aside className="flex h-full w-[260px] flex-col border-r border-[var(--line)] bg-[#070d1a]">
      <div className="border-b border-[var(--line)] p-4">
        <BrandLogo href="/app" size="sm" />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-2 text-[10px] font-semibold tracking-[0.16em] text-[var(--muted)]">
          MAIN MENU
        </p>
        <nav className="space-y-1">
          {NAV.map((item) => {
            const active = isActive(item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-[var(--blue)] font-semibold text-white shadow-[0_0_20px_rgba(0,163,255,0.35)]"
                    : "text-[var(--muted)] hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="inline-flex items-center gap-2.5">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                {active ? <span className="text-xs">›</span> : null}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-[var(--line)] p-3">
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
            <p className="truncate text-sm font-semibold capitalize">{user?.fullName || "Trader"}</p>
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
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close" onClick={() => setOpen(false)} />
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
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === "admin" ? (
              <Link href="/admin" className="hidden text-xs text-[var(--blue)] sm:inline">
                Admin
              </Link>
            ) : null}
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--line)] text-[var(--muted)]"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--line)] lg:hidden"
              onClick={() => setOpen(false)}
              aria-label="Close"
              hidden={!open}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <ActivityBanner />

        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
