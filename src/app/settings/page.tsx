import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getRepository } from "@/lib/data";
import { getViewer } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/Section";
import { ProfileForm } from "./ProfileForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/settings");
  const repo = await getRepository();
  const profile = await repo.getProfileById(viewer.id);
  return (
    <>
      <PageHeader eyebrow="Settings" title="Edit your public profile" description="Your username and scoring fields are managed by Callscore and cannot be edited here." />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <ProfileForm username={viewer.username} displayName={profile?.displayName ?? viewer.displayName} bio={profile?.bio ?? ""} />
      </div>
    </>
  );
}
