"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { cn } from "@/components/ui";

export const NAV_LINKS = [
  { href: "/projects", label: "Projects" },
  { href: "/shipping-feed", label: "Shipping feed" },
  { href: "/deadlines", label: "Deadlines" },
  { href: "/compare", label: "Compare" },
  { href: "/methodology", label: "Methodology" },
];

export function SiteNav({ userSlot }: { userSlot: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
      <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-ink" onClick={() => setOpen(false)}>
        <BrandMark size={32} className="rounded-lg" />
        <span className="tracking-[0.08em]">SHIPTRACE</span>
      </Link>
      <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
        {NAV_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={pathname === l.href || pathname.startsWith(`${l.href}/`) ? "page" : undefined}
            className={cn("rounded-md px-3 py-1.5 text-sm text-slate hover:bg-surface-2 hover:text-ink", (pathname === l.href || pathname.startsWith(`${l.href}/`)) && "bg-surface-2 text-ink")}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="hidden items-center gap-2 md:flex">{userSlot}</div>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-md border border-border p-2 text-slate md:hidden"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
      </button>
      {open ? (
        <div id="mobile-nav" className="absolute left-0 right-0 top-full z-40 border-b border-border bg-surface p-4 md:hidden">
          <nav aria-label="Primary mobile" className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm text-ink hover:bg-surface-2">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">{userSlot}</div>
        </div>
      ) : null}
    </div>
  );
}
