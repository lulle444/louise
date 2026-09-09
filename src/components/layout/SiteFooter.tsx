import Link from "next/link";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { DemoModeBadge } from "@/components/ui/DemoModeBadge";
import { XIcon } from "@/components/ui/XIcon";
import { getXHandle, getXUrl } from "@/lib/config";

export function SiteFooter({ demo }: { demo: boolean }) {
  return (
    <footer className="mt-16 border-t border-border bg-surface/40">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="font-mono text-sm font-semibold tracking-[0.2em]">SIGNAL ARENA</p>
            <p className="mt-2 max-w-md text-sm text-muted">The market has millions of opinions. SIGNAL ARENA keeps the score.</p>
            <a href={getXUrl()} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-text transition hover:border-border-strong hover:bg-surface-2">
              <XIcon className="size-4" /> Follow @{getXHandle()} on X
            </a>
            {demo ? <div className="mt-4"><DemoModeBadge /></div> : null}
          </div>
          <nav aria-label="Product" className="text-sm">
            <p className="eyebrow mb-3">Product</p>
            <ul className="space-y-2 text-muted">
              <li><Link href="/arena" className="hover:text-text">Arena</Link></li>
              <li><Link href="/humans-vs-ai" className="hover:text-text">Humans vs AI</Link></li>
              <li><Link href="/leaderboard" className="hover:text-text">Leaderboard</Link></li>
              <li><Link href="/season" className="hover:text-text">Season recap</Link></li>
              <li><Link href="/methodology" className="hover:text-text">Methodology</Link></li>
            </ul>
          </nav>
          <nav aria-label="Company" className="text-sm">
            <p className="eyebrow mb-3">About</p>
            <ul className="space-y-2 text-muted">
              <li><Link href="/about" className="hover:text-text">About the Arena</Link></li>
              <li><Link href="/token" className="hover:text-text">Token (planned utility)</Link></li>
              <li><Link href="/login" className="hover:text-text">Sign in</Link></li>
              <li><a href={getXUrl()} target="_blank" rel="noopener noreferrer" className="hover:text-text">X / Twitter</a></li>
            </ul>
          </nav>
        </div>
        <div className="mt-8 border-t border-border pt-6">
          <Disclaimer />
        </div>
      </div>
    </footer>
  );
}
