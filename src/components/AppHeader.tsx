import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { Avatar } from "./Avatar";
import { DemoBadge } from "./DemoBadge";
import { MobileNav } from "./MobileNav";
import { XLogo } from "./XLogo";
import { X_HANDLE, X_PROFILE_URL } from "@/lib/config";

export const NAV = [
  { href: "/race", label: "Races" },
  { href: "/ai-vs-crowd", label: "Humans vs AI" },
  { href: "/narratives", label: "Narratives" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/methodology", label: "Methodology" },
];

export async function AppHeader() {
  const { viewer, demo, store } = await getSession();
  const races = await store.listRaces();
  const open = races.find((r) => r.status === "published") ?? races.find((r) => r.status === "live") ?? null;
  const cta = open ? `/race/${open.id}` : "/race";
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-[74px] max-w-7xl items-center gap-5 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="mr-3 flex shrink-0 items-center gap-3 whitespace-nowrap" aria-label="MEGASPRINT home">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG brand mark */}
          <img src="/logo.svg" alt="" width={38} height={38} className="h-[38px] w-[38px] rounded-[10px] shadow-[0_0_0_4px_rgba(180,244,100,0.08)]" />
          <span className="wordmark hidden pr-1 sm:inline">MEGASPRINT</span>
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-lg px-2.5 py-2 text-[0.95rem] text-muted hover:text-ink lg:px-3">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          {demo ? <DemoBadge label="Demo" className="hidden 2xl:inline-flex" /> : null}
          <a href={X_PROFILE_URL} target="_blank" rel="noopener noreferrer" aria-label={`Follow @${X_HANDLE} on X`} className="hidden h-9 w-9 place-items-center rounded-lg text-muted hover:text-ink sm:grid">
            <XLogo className="h-4 w-4" />
          </a>
          {viewer ? (
            <Link href={`/profile/${viewer.username}`} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-surface-2" data-testid="viewer-link">
              <Avatar seed={viewer.id} name={viewer.displayName} size={30} />
              <span className="hidden whitespace-nowrap text-sm sm:inline">{viewer.displayName}</span>
              {viewer.isAdmin ? <span className="rounded bg-violet/20 px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-violet">admin</span> : null}
            </Link>
          ) : (
            <Link href="/login" className="hidden whitespace-nowrap px-2 text-[0.95rem] text-muted hover:text-ink lg:inline" data-testid="signin-link">
              {demo ? "Play as guest" : "Sign in"}
            </Link>
          )}
          <Link href={cta} className="btn btn-primary whitespace-nowrap" data-testid="header-cta">
            <span className="xl:hidden">{open?.status === "published" ? "Enter Race" : "Live Race"}</span>
            <span className="hidden xl:inline">{open?.status === "published" ? "Enter This Week's Race" : "Watch Live Race"}</span>
          </Link>
          <MobileNav items={NAV} />
        </div>
      </div>
    </header>
  );
}
