import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import type { Viewer } from "@/lib/domain/types";
import { signOut } from "@/lib/actions/auth";
import { Avatar } from "@/components/ui/Avatar";

export function UserMenu({ viewer, stacked = false }: { viewer: Viewer | null; stacked?: boolean }) {
  if (!viewer) {
    return (
      <div className={`flex ${stacked ? "flex-col" : "items-center"} gap-2`}>
        <Link href="/login" className="whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted hover:text-text">
          Sign in
        </Link>
        <Link href="/rounds" className="whitespace-nowrap rounded-md bg-cyan px-3.5 py-2 text-sm font-semibold text-white shadow-glow-cyan transition hover:brightness-110">
          Make today’s call
        </Link>
      </div>
    );
  }
  return (
    <div className={`flex ${stacked ? "flex-col items-stretch" : "items-center"} gap-2`}>
      {viewer.isAdmin ? (
        <Link href="/admin" className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-violet hover:bg-surface-2">
          <ShieldCheck className="size-4" aria-hidden /> Admin
        </Link>
      ) : null}
      <Link href={`/profile/${viewer.username}`} className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text hover:bg-surface-2">
        <Avatar name={viewer.displayName} size="sm" />
        <span className="max-w-[10rem] truncate">{viewer.displayName}</span>
        {viewer.isGuest ? <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">guest</span> : null}
      </Link>
      <form action={signOut}>
        <button type="submit" className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-text" aria-label="Sign out">
          <LogOut className="size-4" aria-hidden /> <span className={stacked ? "" : "sr-only lg:not-sr-only"}>Sign out</span>
        </button>
      </form>
    </div>
  );
}
