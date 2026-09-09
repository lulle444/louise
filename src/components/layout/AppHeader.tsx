import Link from "next/link";
import { Radar } from "lucide-react";
import type { Viewer } from "@/lib/domain/types";
import { DemoModeBadge } from "@/components/ui/DemoModeBadge";
import { MobileNavigation } from "./MobileNavigation";
import { NavLinks } from "./NavLinks";
import { UserMenu } from "./UserMenu";

export const NAV_ITEMS = [
  { href: "/arena", label: "Arena" },
  { href: "/humans-vs-ai", label: "Humans vs AI" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/methodology", label: "Methodology" },
];

export function AppHeader({ viewer, demo }: { viewer: Viewer | null; demo: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="SIGNAL ARENA home">
          <span className="grid size-8 place-items-center rounded-lg border border-cyan/40 bg-cyan/10 text-cyan">
            <Radar className="size-4" aria-hidden />
          </span>
          <span className="font-mono text-sm font-semibold tracking-[0.2em] text-text">SIGNAL ARENA</span>
        </Link>
        {demo ? <span className="hidden sm:block"><DemoModeBadge /></span> : null}
        <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Primary">
          <NavLinks items={NAV_ITEMS} />
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <UserMenu viewer={viewer} />
        </div>
        <MobileNavigation items={NAV_ITEMS} viewer={viewer} demo={demo} />
      </div>
    </header>
  );
}
