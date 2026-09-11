import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { SITE } from "@/lib/config";

export const metadata: Metadata = { title: "About", description: SITE.description };

const LOOP = ["Discover project", "Read commitments", "Inspect evidence", "Follow deadline", "Submit evidence", "Moderation", "Status update", "Ship Score changes"];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 text-sm text-slate">
      <PageHeader eyebrow="About" title="Crypto makes promises. SHIPTRACE checks what gets delivered." description={SITE.description} />
      <section aria-labelledby="what-h" className="space-y-3">
        <h2 id="what-h" className="text-xl font-semibold text-ink">What SHIPTRACE records</h2>
        <p>For every tracked project, SHIPTRACE records what was publicly promised (as a short paraphrase with the original source), the deadline, the evidence offered, and the final status. Each project receives a transparent Ship Score based on delivery history, evidence quality, development continuity, product availability, and transparency.</p>
        <ol className="flex flex-wrap gap-2 font-mono text-xs">
          {LOOP.map((step, i) => (
            <li key={step} className="rounded-md border border-border bg-surface px-2 py-1 text-ink">
              {i + 1}. {step}
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="rules-h" className="space-y-3">
        <h2 id="rules-h" className="text-xl font-semibold text-ink">Editorial rules</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Every factual status requires a source URL and access timestamp.</li>
          <li>Project claims, community submissions, automated observations, and moderator conclusions are always labelled separately.</li>
          <li>We never call a project a scam, fraud, or similar based on inactivity or a low score. We write “No qualifying evidence found as of [date]”.</li>
          <li>Every project has a visible correction and dispute pathway; prior decisions stay in the audit history.</li>
          <li>No personalised investment recommendations, no wallet connection, trading, swaps, price targets, token sale, staking, or financial rewards.</li>
          <li>Automated scoring is explainable and versioned; we never fabricate repository, product, uptime, social, or roadmap data.</li>
        </ul>
      </section>
      <section aria-labelledby="not-h" className="space-y-3">
        <h2 id="not-h" className="text-xl font-semibold text-ink">What SHIPTRACE is not</h2>
        <p>SHIPTRACE is not an investment-rating service, a security auditor, or a court. A Ship Score measures documented delivery, not investment quality. Read the full <Link href="/methodology" className="text-primary underline underline-offset-4">methodology</Link> and the <Link href="/token" className="text-primary underline underline-offset-4">token utility</Link> page for what a future token could and could not do.</p>
      </section>
      <section aria-labelledby="bio-h" className="space-y-2">
        <h2 id="bio-h" className="text-xl font-semibold text-ink">In one breath</h2>
        <pre className="rounded-lg border border-border bg-bg p-4 font-mono text-xs text-ink">{"Crypto makes promises.\nWe track what ships.\nRoadmaps · Evidence · Delivery history"}</pre>
      </section>
      <p className="border-t border-border pt-4 text-xs">{SITE.disclaimer}</p>
    </div>
  );
}
