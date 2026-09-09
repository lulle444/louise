import Link from "next/link";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { DemoModeBadge } from "@/components/ui/DemoModeBadge";

export function SiteFooter({ demo }: { demo: boolean }) {
  return (
    <footer className="mt-16 border-t border-border bg-surface/40">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="font-mono text-sm font-semibold tracking-[0.2em]">SIGNAL ARENA</p>
            <p className="mt-2 max-w-md text-sm text-muted">The market has millions of opinions. SIGNAL ARENA keeps the score.</p>
            {demo ? <div className="mt-4"><DemoModeBadge /></div> : null}
          </div>
          <nav aria-label="Product" className="text-sm">
            <p className="eyebrow mb-3">Product</p>
            <ul className="space-y-2 text-muted">
              <li><Link href="/arena" className="hover:text-text">Arena</Link></li>
              <li><Link href="/humans-vs-ai" className="hover:text-text">Humans vs AI</Link></li>
              <li><Link href="/leaderboard" className="hover:text-text">Leaderboard</Link></li>
              <li><Link href="/methodology" className="hover:text-text">Methodology</Link></li>
            </ul>
          </nav>
          <nav aria-label="Company" className="text-sm">
            <p className="eyebrow mb-3">About</p>
            <ul className="space-y-2 text-muted">
              <li><Link href="/about" className="hover:text-text">About the Arena</Link></li>
              <li><Link href="/token" className="hover:text-text">Token (planned utility)</Link></li>
              <li><Link href="/login" className="hover:text-text">Sign in</Link></li>
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
