import type { Metadata } from "next";
import Link from "next/link";
import { BrandImage } from "@/components/BrandImage";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/ui";
import { EVIDENCE_RANK, EVIDENCE_TYPE_LABELS, EVIDENCE_WEIGHT } from "@/lib/domain/evidence";
import { FORMULA_V0_9, FORMULA_V1 } from "@/lib/domain/score";
import { STATUS_DESCRIPTIONS } from "@/lib/domain/status";
import { EVIDENCE_TYPES, MILESTONE_STATUSES } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Methodology", description: "How SHIPTRACE records commitments, ranks evidence, moderates submissions, and calculates the versioned Ship Score." };

const SECTIONS = [
  ["formula", "Scoring formula"],
  ["delivery", "Delivery credit"],
  ["components", "Other components"],
  ["evidence", "Evidence hierarchy"],
  ["moderation", "Moderation process"],
  ["github", "Repository interpretation"],
  ["website", "Website checks"],
  ["freshness", "Freshness and confidence"],
  ["statuses", "Status definitions"],
  ["disputes", "Dispute handling"],
  ["limitations", "Limitations"],
];

export default function MethodologyPage() {
  const f = FORMULA_V1;
  return (
    <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
      <nav aria-label="Methodology sections" className="lg:sticky lg:top-24 lg:self-start">
        <ol className="space-y-1 text-sm">
          {SECTIONS.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="block rounded-md px-2 py-1 text-slate hover:bg-surface-2 hover:text-ink">
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="prose-shiptrace max-w-3xl space-y-12 text-sm text-slate">
        <PageHeader eyebrow="Methodology" title="How SHIPTRACE works" description="SHIPTRACE is an evidence-based product-delivery tracker. It records what a project publicly promised, the deadline, the evidence offered, and the final status. It is not an investment-rating service." />
        <BrandImage name="scoreRing" sizes="(min-width: 1024px) 60vw, 100vw" />

        <section id="formula" aria-labelledby="formula-h" className="space-y-3">
          <h2 id="formula-h" className="text-xl font-semibold text-ink">Scoring formula</h2>
          <p>The Ship Score is a 0–100 number computed only when minimum data exists. Otherwise the project shows <strong className="text-ink">Insufficient data</strong> rather than a misleading number.</p>
          <pre className="overflow-x-auto rounded-lg border border-border bg-bg p-4 font-mono text-xs text-ink">ship_score = delivery×{f.weights.delivery} + development×{f.weights.development} + availability×{f.weights.availability} + transparency×{f.weights.transparency} + evidence×{f.weights.evidence}</pre>
          <ul className="list-disc space-y-1 pl-5">
            <li>Current formula version: <span className="font-mono text-ink">{f.version}</span>. Earlier version <span className="font-mono text-ink">{FORMULA_V0_9.version}</span> (unweighted delivery) is kept so historical snapshots remain reproducible.</li>
            <li>A total requires a delivery component and at least {Math.round(f.minWeightCoverage * 100)}% of formula weight available. Missing components are excluded and the total is renormalised over available weight; missing data is never assumed to be good or bad.</li>
            <li>Every snapshot stores the raw component values, total, confidence, data completeness, formula version and calculation timestamp. Historical snapshots are never rewritten; recalculations append new snapshots.</li>
          </ul>
        </section>

        <section id="delivery" aria-labelledby="delivery-h" className="space-y-3">
          <h2 id="delivery-h" className="text-xl font-semibold text-ink">Delivery credit (40%)</h2>
          <p>Only moderator-approved milestones whose deadlines have passed are counted. Each receives a credit, weighted by importance tier (core ×{f.importanceWeights.core}, major ×{f.importanceWeights.major}, minor ×{f.importanceWeights.minor}) so trivial milestones cannot inflate a score. At least {f.minDeliveryMilestones} counted milestones are required.</p>
          <table className="data w-full">
            <thead>
              <tr>
                <th scope="col">Outcome</th>
                <th scope="col">Credit</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Shipped on or before the deadline</td><td className="font-mono">{f.credits.shippedOnTime}</td></tr>
              <tr><td>Shipped after the deadline</td><td className="font-mono">{f.credits.shippedLate}</td></tr>
              <tr><td>Partially shipped</td><td className="font-mono">{f.credits.partiallyShipped}</td></tr>
              <tr><td>Delayed with a published, updated explanation</td><td className="font-mono">{f.credits.delayedWithExplanation}</td></tr>
              <tr><td>Delayed without an updated explanation</td><td className="font-mono">{f.credits.delayedWithoutExplanation}</td></tr>
              <tr><td>No qualifying evidence</td><td className="font-mono">{f.credits.noEvidence}</td></tr>
              <tr><td>Cancelled with a transparent explanation</td><td>Shown separately; excluded from the delivery component</td></tr>
              <tr><td>Cancelled without explanation</td><td className="font-mono">{f.credits.cancelledWithoutExplanation}</td></tr>
              <tr><td>Disputed</td><td>Excluded until resolution</td></tr>
            </tbody>
          </table>
          <p>delivery = Σ(credit × weight) ÷ Σ(weight), rounded. The exact per-milestone calculation is published on every project page under “Show exact calculation”.</p>
        </section>

        <section id="components" aria-labelledby="components-h" className="space-y-3">
          <h2 id="components-h" className="text-xl font-semibold text-ink">Other components</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong className="text-ink">Development continuity (20%)</strong> = 0.5 × (active weeks in last 12 ÷ 12) + 0.3 × min(1, releases+tags in 90 days ÷ 3) + 0.2 × push recency (≤30 days 1.0, ≤90 days 0.5, ≤180 days 0.2). Raw commit counts are never used as proof of delivery.</li>
            <li><strong className="text-ink">Product availability (15%)</strong> = mean success rate of the last 30 timestamped checks for each explicitly listed, approved endpoint.</li>
            <li><strong className="text-ink">Transparency (15%)</strong> = 0.3 × min(1, dated roadmap updates ÷ 4) + 0.3 × explanation rate + 0.2 × public documentation + 0.2 × change disclosure rate. Inputs are recorded by moderators from public sources.</li>
            <li><strong className="text-ink">Evidence quality (10%)</strong> = mean over accepted evidence of hierarchy weight × (0.6 + 0.4 × completeness), where completeness rewards a URL, title, summary, published date and access timestamp.</li>
          </ul>
        </section>

        <section id="evidence" aria-labelledby="evidence-h" className="space-y-3">
          <h2 id="evidence-h" className="text-xl font-semibold text-ink">Evidence hierarchy</h2>
          <table className="data w-full">
            <thead>
              <tr>
                <th scope="col">Tier</th>
                <th scope="col">Type</th>
                <th scope="col">Weight</th>
              </tr>
            </thead>
            <tbody>
              {EVIDENCE_TYPES.map((t) => (
                <tr key={t}>
                  <td className="font-mono">{EVIDENCE_RANK[t]}</td>
                  <td>{EVIDENCE_TYPE_LABELS[t]}</td>
                  <td className="font-mono">{EVIDENCE_WEIGHT[t]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>Social posts alone do not prove complex delivery. Screenshots without a source URL are weak evidence. Archived links may supplement but never silently replace primary evidence. Community observations need corroboration by at least one other source.</p>
        </section>

        <section id="moderation" aria-labelledby="moderation-h" className="space-y-3">
          <h2 id="moderation-h" className="text-xl font-semibold text-ink">Moderation process</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Community submissions are stored as <em>pending</em> and shown as visibly unverified. They never directly change a verified status.</li>
            <li>A moderator accepts, rejects, or requests clarification, always with a written reason recorded in the audit log.</li>
            <li>Only moderators change a verified status. Every change records actor, timestamp, reason, evidence references, and prior/new status. Delivery statuses require accepted evidence references.</li>
            <li>Conflicts of interest can be disclosed on any submission. Project representatives may request corrections but cannot edit status or score.</li>
            <li>Material history is never silently deleted. Prior decisions remain visible after a correction.</li>
          </ol>
        </section>

        <section id="github" aria-labelledby="github-h" className="space-y-3">
          <h2 id="github-h" className="text-xl font-semibold text-ink">Repository interpretation</h2>
          <p>When configured, SHIPTRACE fetches public repository metadata, releases, tags, recent activity and the default branch, storing the source and retrieval time. Snapshots are cached and taken at most once per day per repository. A release or tag is an observation that may be cited as evidence; activity on its own is never a conclusion about delivery.</p>
        </section>

        <section id="website" aria-labelledby="website-h" className="space-y-3">
          <h2 id="website-h" className="text-xl font-semibold text-ink">Website checks</h2>
          <p>Only endpoints explicitly listed by a project and approved by an admin are checked. Each check stores the HTTP result, timestamp and latency. One failed check never proves abandonment; availability uses a rolling window and neutral labels.</p>
        </section>

        <section id="freshness" aria-labelledby="freshness-h" className="space-y-3">
          <h2 id="freshness-h" className="text-xl font-semibold text-ink">Freshness and confidence</h2>
          <p>Every page shows when data was last checked. Confidence = data completeness × (0.5 + 0.5 × min(1, counted milestones ÷ 8)), displayed as High (≥0.8), Medium (≥0.5) or Low. Data completeness is the share of formula weight backed by actual data.</p>
        </section>

        <section id="statuses" aria-labelledby="statuses-h" className="space-y-3">
          <h2 id="statuses-h" className="text-xl font-semibold text-ink">Status definitions</h2>
          <p className="font-mono text-xs">planned → in_progress → submitted_for_review → shipped | partially_shipped | delayed | no_evidence | cancelled | disputed</p>
          <dl className="space-y-2">
            {MILESTONE_STATUSES.map((s) => (
              <div key={s} className="flex flex-wrap items-center gap-3">
                <dt>
                  <StatusBadge status={s} />
                </dt>
                <dd>{STATUS_DESCRIPTIONS[s]}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="disputes" aria-labelledby="disputes-h" className="space-y-3">
          <h2 id="disputes-h" className="text-xl font-semibold text-ink">Dispute handling</h2>
          <p>Anyone can file a correction or dispute from a project page or Evidence Room. A disputed milestone is excluded from the score until a moderator records a resolution. Resolutions are public, and the milestone&apos;s status history keeps both the original decision and the resolution.</p>
        </section>

        <section id="limitations" aria-labelledby="limitations-h" className="space-y-3">
          <h2 id="limitations-h" className="text-xl font-semibold text-ink">Limitations</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>SHIPTRACE tracks public commitments only. Private roadmaps and unannounced work are invisible to it.</li>
            <li>Moderator judgement is involved in paraphrasing commitments and assessing scope; reasons are published so they can be challenged.</li>
            <li>The Ship Score is not an investment recommendation, security audit, legal conclusion, or guarantee of future delivery.</li>
            <li>SHIPTRACE never calls a project a scam, fraud or similar based on inactivity or a low score. It records the absence of evidence with a date.</li>
            <li>Platforms are not scraped contrary to their rules; sources are submitted as URLs and reviewed.</li>
          </ul>
          <p>
            Questions or corrections about this methodology can be filed through the{" "}
            <Link href="/submit?tab=correction" className="text-primary underline underline-offset-4">
              correction form
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
