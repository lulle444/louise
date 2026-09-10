import Link from "next/link";
import { Activity } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { Avatar } from "./Avatar";
import { DemoBadge } from "./DemoBadge";
import { MobileNav } from "./MobileNav";

export const NAV = [
  { href: "/race", label: "Races" },
  { href: "/narratives", label: "Narratives" },
  { href: "/ai-vs-crowd", label: "AI vs Crowd" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/methodology", label: "Methodology" },
];

export async function AppHeader() {
  const { viewer, demo } = await getSession();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight" aria-label="MEGASPRINT home">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-lime text-bg">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="hidden sm:inline">MEGASPRINT</span>
        </Link>
        {demo ? <DemoBadge label="Demo mode" className="hidden md:inline-flex" /> : null}
        <nav aria-label="Primary" className="ml-auto hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {viewer ? (
            <Link href={`/profile/${viewer.username}`} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-surface-2" data-testid="viewer-link">
              <Avatar seed={viewer.id} name={viewer.displayName} size={30} />
              <span className="hidden text-sm sm:inline">{viewer.displayName}</span>
              {viewer.isAdmin ? <span className="rounded bg-violet/20 px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-violet">admin</span> : null}
            </Link>
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm" data-testid="signin-link">
              {demo ? "Play as guest" : "Sign in"}
            </Link>
          )}
          <MobileNav items={NAV} />
        </div>
      </div>
    </header>
  );
}
