import Link from "next/link";
import { Disclaimer } from "./Disclaimer";
import { APP_NAME } from "@/lib/config";

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface/60">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
        <div className="max-w-2xl space-y-2">
          <p className="font-semibold tracking-tight">{APP_NAME}</p>
          <Disclaimer compact />
          <p className="text-xs text-dim">Virtual points only. No deposits, wagers, prizes, wallets, or trade execution.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted md:flex-col">
          <Link href="/methodology" className="hover:text-ink">Methodology</Link>
          <Link href="/narratives" className="hover:text-ink">Narratives</Link>
          <Link href="/ai-vs-crowd" className="hover:text-ink">AI vs Crowd</Link>
          <Link href="/token" className="hover:text-ink">Future utility</Link>
          <Link href="/admin" className="hover:text-ink">Admin</Link>
        </nav>
      </div>
    </footer>
  );
}
