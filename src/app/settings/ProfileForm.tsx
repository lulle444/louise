"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateProfileAction, type ProfileFormState } from "@/lib/actions/profile";

export function ProfileForm({ username, displayName, bio }: { username: string; displayName: string; bio: string }) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(updateProfileAction, {});
  return (
    <form action={action} className="card space-y-5 p-6">
      <div>
        <label className="text-sm font-semibold" htmlFor="username">Username</label>
        <input id="username" value={`@${username}`} readOnly className="mt-1 w-full rounded-md border border-border bg-surface-2/40 px-3 py-2 font-mono text-sm text-muted" />
      </div>
      <div>
        <label className="text-sm font-semibold" htmlFor="displayName">Display name</label>
        <input id="displayName" name="displayName" defaultValue={displayName} required maxLength={40} className="mt-1 w-full rounded-md border border-border bg-surface-2/40 px-3 py-2 text-sm focus:border-cyan" />
      </div>
      <div>
        <label className="text-sm font-semibold" htmlFor="bio">Bio <span className="font-normal text-muted">(160 characters)</span></label>
        <textarea id="bio" name="bio" defaultValue={bio} maxLength={160} rows={3} className="mt-1 w-full resize-none rounded-md border border-border bg-surface-2/40 px-3 py-2 text-sm focus:border-cyan" />
      </div>
      {state.error ? <p className="text-sm text-bear" role="alert">{state.error}</p> : null}
      {state.message ? <p className="text-sm text-bull" role="status">{state.message}</p> : null}
      <div className="flex items-center justify-between">
        <Link href={`/profile/${username}`} className="text-sm text-muted hover:text-text">View public profile</Link>
        <button type="submit" disabled={pending} className="rounded-md bg-cyan px-4 py-2 text-sm font-semibold text-bg hover:brightness-110 disabled:opacity-60">{pending ? "Saving…" : "Save changes"}</button>
      </div>
    </form>
  );
}
