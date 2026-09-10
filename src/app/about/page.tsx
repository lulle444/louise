import type { Metadata } from "next";
import Link from "next/link";
import { Ban, Radar, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/Section";
import { Disclaimer } from "@/components/ui/Disclaimer";

export const metadata: Metadata = { title: "About", description: "What Callscore is, the principles behind it, and how the virtual-points model works." };

export default function AboutPage() {
  return (
    <>
      <PageHeader eyebrow="About" title="The market has millions of opinions. Callscore keeps the score." description="A competitive crypto-intelligence platform where humans, AI profiles, and the crowd face the same market challenges." />
      <div className="mx-auto max-w-3xl space-y-10 px-4 py-10 text-sm leading-relaxed text-muted sm:px-6">
        <section>
          <h2 className="text-lg font-semibold text-text">The concept</h2>
          <p className="mt-2">Every day Callscore publishes a Market Round on BTC, ETH or SOL. You call the direction — Bullish, Neutral or Bearish — choose exactly three supporting signals, set your confidence, and lock. Three rule-based AI analysts and the aggregated crowd forecast the same Round under the same rules. When the Round settles against an authoritative end-price snapshot, everyone is scored, and every forecast becomes a public, timestamped Call Card.</p>
          <p className="mt-2">Over time you build a transparent track record: accuracy, streaks, an Callscore rating and a Call Profile that shows which reasoning you rely on and where it works.</p>
        </section>
        <section className="grid gap-4 sm:grid-cols-2">
          {[
            { Icon: Radar, title: "Same rules for everyone", body: "Humans, AI profiles and the crowd see the same market, timeframe, threshold and clock. Nobody gets a late look." },
            { Icon: ShieldCheck, title: "Auditable, not vague", body: "Prices, timestamps, thresholds and formulas are published. Calls are immutable once locked." },
            { Icon: Users, title: "Reasoning over noise", body: "A forecast is three signals and a thesis, not an up/down guess. The crowd is revealed only after you commit." },
            { Icon: Ban, title: "No money, ever", body: "Virtual XP and reputation only. No deposits, stakes, prizes, leverage, trading or portfolio links." },
          ].map((c) => (
            <div key={c.title} className="card p-5">
              <span className="grid size-9 place-items-center rounded-lg border border-cyan/30 bg-cyan/10 text-cyan"><c.Icon className="size-4" aria-hidden /></span>
              <h3 className="mt-3 font-semibold text-text">{c.title}</h3>
              <p className="mt-1">{c.body}</p>
            </div>
          ))}
        </section>
        <section>
          <h2 className="text-lg font-semibold text-text">The virtual-points model</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>You earn XP for locking valid forecasts, for correct results and for streaks. XP unlocks levels from Observer to Oracle.</li>
            <li>Round Score is 100 for a correct direction and 0 otherwise. Confidence is analysed for calibration but never multiplies your score.</li>
            <li>Badges are cosmetic. Nothing on Callscore can be deposited, withdrawn, traded, or converted into money or tokens.</li>
            <li>Track records are forecasting-game history. They are not verified investment performance and do not predict future results.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-text">What Callscore will never do</h2>
          <p className="mt-2">Ask you to stake or wager; reward you with money or tokens; execute or recommend trades; show a wallet balance, P&amp;L or leverage; or promise that forecasting accuracy translates into returns. The AI profiles are educational simulations, and their forecasts are not financial advice.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-text">Learn more</h2>
          <p className="mt-2"><Link href="/methodology" className="text-cyan hover:underline">Methodology</Link> · <Link href="/humans-vs-ai" className="text-cyan hover:underline">Humans vs AI</Link> · <Link href="/token" className="text-cyan hover:underline">Planned token utility</Link></p>
        </section>
        <Disclaimer />
      </div>
    </>
  );
}
