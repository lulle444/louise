import Link from "next/link";
import type { Viewer } from "@/lib/domain/types";
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
  { href: "/learn", label: "Learn" },
  { href: "/methodology", label: "Methodology" },
];

export function AppHeader({ viewer, demo }: { viewer: Viewer | null; demo: boolean }) {
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6">
      <div className="header-pill mx-auto flex h-14 max-w-7xl items-center gap-4 rounded-full px-3 sm:px-5">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Alphr home">
          <TallyMark size={30} />
          <Wordmark />
        </Link>
        <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Primary">
          <NavLinks items={NAV_ITEMS} />
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <a href={getXUrl()} target="_blank" rel="noopener noreferrer" className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-text" aria-label={`ALPHR on X (@${getXHandle()})`} title={`@${getXHandle()} on X`}>
            <XIcon className="size-4" />
          </a>
          <UserMenu viewer={viewer} />
        </div>
        <MobileNavigation items={NAV_ITEMS} viewer={viewer} demo={demo} xUrl={getXUrl()} xHandle={getXHandle()} />
      </div>
    </header>
  );
}
