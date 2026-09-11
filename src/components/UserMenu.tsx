import Link from "next/link";
import { LogIn, LogOut, ShieldCheck, User } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { isModerator } from "@/lib/domain/auth";
import type { SessionUser } from "@/lib/domain/types";

export function UserMenu({ user }: { user: SessionUser | null }) {
  if (!user) {
    return (
      <>
        <Link href="/login" className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-slate hover:bg-surface-2 hover:text-ink">
          <LogIn className="h-4 w-4" aria-hidden="true" /> Sign in
        </Link>
        <Link href="/submit" className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-bg hover:bg-[#7aa1ff]">
          Submit evidence
        </Link>
      </>
    );
  }
  return (
    <>
      <Link href="/watchlist" className="rounded-md px-3 py-1.5 text-sm text-slate hover:bg-surface-2 hover:text-ink">
        Watchlist
      </Link>
      {isModerator(user) ? (
        <Link href="/admin" className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-mint hover:bg-surface-2">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Admin
        </Link>
      ) : null}
      <Link href={`/profile/${user.username}`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-slate hover:bg-surface-2 hover:text-ink">
        <User className="h-4 w-4" aria-hidden="true" /> {user.username}
      </Link>
      <Link href="/submit" className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-bg hover:bg-[#7aa1ff]">
        Submit
      </Link>
      <form action={signOut}>
        <button type="submit" className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-slate hover:bg-surface-2 hover:text-ink" aria-label="Sign out">
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </>
  );
}
