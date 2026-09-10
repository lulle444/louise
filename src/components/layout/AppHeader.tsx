import Link from "next/link";
import type { Viewer } from "@/lib/domain/types";
import { DemoModeBadge } from "@/components/ui/DemoModeBadge";
import { TallyMark, Wordmark } from "@/components/ui/TallyMark";
import { XIcon } from "@/components/ui/XIcon";
import { getXHandle, getXUrl } from "@/lib/config";
import { MobileNavigation } from "./MobileNavigation";
import { NavLinks } from "./NavLinks";
import { UserMenu } from "./UserMenu";

export const NAV_ITEMS = [
  { href: "/rounds", label: "Rounds" },
  { href: "/humans-vs-ai", label: "Humans vs AI" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/weekly", label: "Weekly" },
  { href: "/methodology", label: "Methodology" },
];

export function AppHeader({ viewer, demo }: { viewer: Viewer | null; demo: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Callscore home">
          <TallyMark size={30} />
          <Wordmark />
        </Link>
        {demo ? <span className="hidden lg:block"><DemoModeBadge short /></span> : null}
        <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Primary">
          <NavLinks items={NAV_ITEMS} />
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <a href={getXUrl()} target="_blank" rel="noopener noreferrer" className="grid size-9 place-items-center rounded-md text-muted transition hover:bg-surface-2 hover:text-text" aria-label={`CALLSCORE on X (@${getXHandle()})`} title={`@${getXHandle()} on X`}>
            <XIcon className="size-4" />
          </a>
          <UserMenu viewer={viewer} />
        </div>
        <MobileNavigation items={NAV_ITEMS} viewer={viewer} demo={demo} xUrl={getXUrl()} xHandle={getXHandle()} />
      </div>
    </header>
  );
}
