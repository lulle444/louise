import Link from "next/link";
import { LogIn, LogOut, ShieldCheck, User } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { SITE } from "@/lib/config";
import { isModerator } from "@/lib/domain/auth";
import { SAFE_EXTERNAL_LINK_PROPS } from "@/lib/domain/url";
import { XIcon } from "./XIcon";
import type { SessionUser } from "@/lib/domain/types";

function XLink() {
  return (
    <a href={SITE.xUrl} className="inline-flex items-center justify-center rounded-md p-2 text-slate hover:bg-surface-2 hover:text-ink" aria-label="SHIPTRACE on X" title="SHIPTRACE on X" {...SAFE_EXTERNAL_LINK_PROPS}>
      <XIcon className="h-4 w-4" />
    </a>
  );
}

export function UserMenu({ user }: { user: SessionUser | null }) {
  if (!user) {
    return (
      <>
        <XLink />
        <Link href="/login" className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-slate hover:bg-surface-2 hover:text-ink">
          <LogIn className="h-4 w-4" aria-hidden="true" /> Sign in
        </Link>
        <Link href="/submit" className="rounded-md btn btn-primary px-3 py-1.5 text-sm font-semibold text-white">
          Submit evidence
        </Link>
      </>
    );
  }
  return (
    <>
      <XLink />
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
      <Link href="/submit" className="rounded-md btn btn-primary px-3 py-1.5 text-sm font-semibold text-white">
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
