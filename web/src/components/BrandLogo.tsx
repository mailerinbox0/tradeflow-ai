import Link from "next/link";
import { BRAND } from "@/lib/constants";

/** TradeFlow AI mark — flowing chart path, not shared with any other brand. */
export function BrandLogo({
  href = "/",
  size = "md",
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
}) {
  const box = size === "lg" ? "h-11 w-11" : size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const title = size === "lg" ? "text-base" : "text-sm";

  return (
    <Link href={href} className="flex items-center gap-2.5">
      <span
        className={`grid ${box} place-items-center rounded-lg border border-[rgba(47,163,255,0.35)] bg-[rgba(15,26,49,0.9)] shadow-[0_0_18px_rgba(0,163,255,0.25)]`}
        aria-hidden
      >
        <svg viewBox="0 0 32 32" className="h-[55%] w-[55%]" fill="none">
          <path
            d="M4 22 C8 18 10 24 14 16 C18 8 20 12 24 9 L28 7"
            stroke="#00A3FF"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="28" cy="7" r="2.2" fill="#22C55E" />
        </svg>
      </span>
      <span>
        <span className={`block ${title} font-bold tracking-[0.06em] uppercase text-white`}>
          TradeFlow <span className="text-[var(--blue)]">AI</span>
        </span>
        <span className="block text-[9px] tracking-[0.16em] text-[var(--blue)] uppercase sm:text-[10px]">
          {BRAND.tagline}
        </span>
      </span>
    </Link>
  );
}
