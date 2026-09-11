import type { Metadata } from "next";
import Link from "next/link";
import { Ban, Vote, History, Lock, Sparkles, MessageSquare } from "lucide-react";
import { Alert, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Token (future utility)", description: "Informational overview of possible future utility. The token cannot buy a better score, remove evidence, or control factual status. No sale, no price projection." };

const UTILITY = [
  { Icon: Vote, title: "Voting on research priorities", body: "Signal which projects the research team should document next. Votes affect the queue, never the findings." },
  { Icon: History, title: "Advanced history", body: "Longer score-history windows and export of stored snapshots." },
  { Icon: Lock, title: "Private research lists", body: "Personal, non-financial lists of projects and milestones to track." },
  { Icon: Sparkles, title: "Cosmetic contributor profiles", body: "Profile themes and badges. Rankings never depend on token holdings." },
  { Icon: MessageSquare, title: "Community proposals", body: "Propose methodology clarifications, which moderators and the editorial team review publicly." },
];

const CANNOT = ["buy a better Ship Score or influence any component", "remove, hide, or downrank evidence", "control or override a factual status", "serve as a stake, collateral, or reward mechanism", "promise returns or any financial outcome"];

export default function TokenPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader eyebrow="Informational" title="Token: possible future utility" description="This page describes non-financial utility that may exist in the future. There is no token sale, no purchase link, and no price projection on SHIPTRACE." />
      <Alert tone="amber" title="Nothing on this page is an offer or recommendation">
        SHIPTRACE does not sell tokens, connect wallets, execute trades, provide staking, or pay financial rewards. Editorial outcomes are never for sale.
      </Alert>
      <section aria-labelledby="utility-h">
        <h2 id="utility-h" className="text-xl font-semibold text-ink">What a token could be used for</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {UTILITY.map(({ Icon, title, body }) => (
            <li key={title} className="card p-4">
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <p className="mt-2 font-medium text-ink">{title}</p>
              <p className="mt-1 text-sm text-slate">{body}</p>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="cannot-h" className="card border-coral/30 p-5">
        <h2 id="cannot-h" className="flex items-center gap-2 text-xl font-semibold text-ink">
          <Ban className="h-5 w-5 text-coral" aria-hidden="true" /> What it can never do
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate">
          {CANNOT.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>
      <p className="text-sm text-slate">
        The editorial rules that make these guarantees are published in the{" "}
        <Link href="/methodology" className="text-primary underline underline-offset-4">
          methodology
        </Link>
        .
      </p>
    </div>
  );
}
