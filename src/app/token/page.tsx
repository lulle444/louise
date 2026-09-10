import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Brush, Lock, MessageSquare, Users, Vote } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";

export const metadata: Metadata = { title: "Future utility" };

const UTILITY = [
  { icon: Vote, title: "Community votes on new narratives", body: "Propose and vote on which narratives join the weekly field." },
  { icon: BarChart3, title: "Extra historical analytics", body: "Deeper archives of narrative snapshots and Race replays." },
  { icon: Lock, title: "Private leagues", body: "Run a Race among friends or a community with the same public scoring." },
  { icon: Brush, title: "Cosmetic themes", body: "Profile and Race Card themes. Purely visual." },
  { icon: MessageSquare, title: "Community proposals", body: "Suggest scoring or methodology changes for public discussion." },
];

export default function TokenPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <SectionHeading eyebrow="Informational" title="A possible future access token" description="This page describes ideas only. Nothing here is for sale, and nothing is required to play." />
      <div className="card space-y-2 border-amber/40 p-5 text-sm text-muted">
        <p className="font-semibold text-ink">What a token would never do</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>It is not required to play, score, or rank in any Race.</li>
          <li>It is never staked, wagered, or otherwise placed into a Race.</li>
          <li>It has no effect on Narrative Scores, Race scoring, XP, badges, or Meta DNA.</li>
          <li>It offers no promised return, yield, or prize. There is no sale, no price, and no countdown.</li>
        </ul>
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Potential access and community utility</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {UTILITY.map((u) => (
            <li key={u.title} className="card p-4">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-violet/15 text-violet">
                <u.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="mt-3 font-semibold">{u.title}</p>
              <p className="mt-1 text-sm text-muted">{u.body}</p>
            </li>
          ))}
        </ul>
      </section>
      <p className="text-sm text-muted">
        <Users className="mr-1 inline h-4 w-4" aria-hidden="true" />
        MEGASPRINT is an educational forecasting game using virtual points. Read the <Link href="/methodology" className="text-cyan hover:underline">methodology</Link> for how scoring works today.
      </p>
    </div>
  );
}
