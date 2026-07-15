"use client";

import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { BRAND } from "@/lib/constants";

const NAV = [
  { href: "#about", label: "About" },
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#contact", label: "Contact" },
];

export function SiteHeader({
  solid = false,
  /** Careers / applicant pages: large brand, no marketing nav */
  variant = "default",
}: {
  solid?: boolean;
  variant?: "default" | "careers";
}) {
  const [open, setOpen] = useState(false);
  const careers = variant === "careers";

  return (
    <header
      className={`sticky top-0 z-50 border-b border-[var(--line)] ${
        solid ? "bg-[rgba(5,11,24,0.98)]" : "bg-[rgba(5,11,24,0.88)] backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <BrandLogo href={careers ? "/careers" : "/"} size={careers ? "lg" : "md"} />
          {careers ? (
            <p className="mt-1 hidden text-xs text-[var(--muted)] sm:block">
              {BRAND.name} · Careers & Employment
            </p>
          ) : null}
        </div>

        {!careers ? (
          <nav className="hidden items-center gap-7 text-sm text-[var(--muted)] lg:flex">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="transition hover:text-white">
                {item.label}
              </a>
            ))}
          </nav>
        ) : (
          <p className="hidden max-w-xs text-right text-sm font-medium text-white md:block">
            TradeFlow <span className="text-[var(--blue)]">AI</span>
            <span className="mt-0.5 block text-xs font-normal text-[var(--muted)]">
              Professional trading platform · Hiring remote talent
            </span>
          </p>
        )}

        {!careers ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/auth/login" className="hidden text-sm text-white sm:inline">
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="tf-btn tf-btn-primary !min-h-10 !rounded-xl !px-3 text-sm tf-glow"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] text-white lg:hidden"
              aria-label="Menu"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        ) : null}
      </div>

      {!careers && open ? (
        <div className="border-t border-[var(--line)] px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-3 text-sm">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[var(--muted)]"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <Link href="/auth/login" className="text-white" onClick={() => setOpen(false)}>
              Sign In
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
