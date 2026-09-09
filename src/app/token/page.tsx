import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Lock, Palette, Users, Vote, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/Section";
import { Disclaimer } from "@/components/ui/Disclaimer";

export const metadata: Metadata = { title: "Token (planned utility)", description: "Informational overview of possible future community utility. Not an offer, sale or investment." };

export default function TokenPage() {
  const utilities = [
    { Icon: Vote, title: "Community voting", body: "Vote on which assets and Battle formats the Arena adds next." },
    { Icon: BarChart3, title: "Advanced historical analytics", body: "Deeper views of signal performance and calibration over long horizons." },
    { Icon: Users, title: "Private analyst groups", body: "Run invite-only Battles with your own group and a shared scoreboard." },
    { Icon: Palette, title: "Cosmetic themes", body: "Profile and Signal Card themes. Purely visual." },
    { Icon: FileText, title: "Community proposals", body: "Propose and discuss rule changes, new signals and methodology updates." },
  ];
  return (
    <>
      <PageHeader eyebrow="Planned utility · informational" title="A possible future community token" description="This page describes ideas under consideration. Nothing here is available today, and nothing here is an offer, sale or investment." />
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
        <div className="card border-neutral/40 p-5 text-sm" role="note">
          <p className="inline-flex items-center gap-2 font-semibold text-neutral"><Lock className="size-4" aria-hidden /> Read this first</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
            <li><strong className="text-text">No token is needed for the core forecasting experience.</strong> Battles, scoring, leaderboards and Signal Cards are and will remain free to use.</li>
            <li><strong className="text-text">The token is never used as a prediction stake.</strong> Forecasts always use virtual XP only.</li>
            <li><strong className="text-text">No financial return is promised.</strong> Any token would be a utility for community features, not an investment.</li>
            <li><strong className="text-text">Features are planned and subject to change.</strong> They may ship differently or not at all.</li>
          </ul>
        </div>
        <section>
          <h2 className="text-lg font-semibold">What a token could support</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {utilities.map((u) => (
              <div key={u.title} className="card p-5">
                <span className="grid size-9 place-items-center rounded-lg border border-violet/30 bg-violet/10 text-violet"><u.Icon className="size-4" aria-hidden /></span>
                <h3 className="mt-3 font-semibold">{u.title}</h3>
                <p className="mt-1 text-sm text-muted">{u.body}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="text-sm text-muted">
          <h2 className="text-lg font-semibold text-text">What this page deliberately does not include</h2>
          <p className="mt-2">Price projections, sale dates, allocation tables, purchase links, guaranteed benefits or any investment language. If you see those anywhere claiming to be SIGNAL ARENA, they are not from us.</p>
          <p className="mt-4"><Link href="/about" className="text-cyan hover:underline">Read the product principles →</Link></p>
        </section>
        <Disclaimer />
      </div>
    </>
  );
}
