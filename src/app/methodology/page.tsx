import type { Metadata } from "next";
import Link from "next/link";
import { DEFAULT_NEUTRAL_THRESHOLD_PERCENT, MIN_ASSET_BATTLES, MIN_DNA_BATTLES, MIN_RANKED_BATTLES, MIN_SIGNAL_USES, isDemoMode } from "@/lib/config";
import { LEVELS, XP_RULES } from "@/lib/domain/scoring";
import { AI_PROFILES, SIGNALS } from "@/lib/domain/catalogue";
import { PageHeader } from "@/components/ui/Section";

export const metadata: Metadata = { title: "Methodology", description: "How SIGNAL ARENA snapshots prices, settles Battles, aggregates the crowd, scores forecasts and ranks analysts." };

function H({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="scroll-mt-24 text-lg font-semibold">{children}</h2>;
}

export default function MethodologyPage() {
  const demo = isDemoMode();
  const sections = [
    ["data-sources", "Data sources"], ["snapshots", "Price snapshot rules"], ["neutral", "Neutral threshold"], ["settlement", "Settlement process"], ["void", "Void rules"], ["ai", "AI profile methodology"], ["crowd", "Crowd aggregation"], ["accuracy", "Accuracy calculation"], ["leaderboard", "Leaderboard formula"], ["xp", "XP, levels and badges"], ["dna", "Signal DNA"], ["limitations", "Data limitations"],
  ];
  return (
    <>
      <PageHeader eyebrow="Methodology" title="How the Arena keeps score" description="Every rule that turns a forecast into a verified result, published so anyone can audit the score." />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm lg:flex-col">
            {sections.map(([id, label]) => <li key={id}><a href={`#${id}`} className="text-muted hover:text-text">{label}</a></li>)}
          </ul>
        </nav>
        <div className="prose-arena max-w-3xl space-y-10 text-sm leading-relaxed text-muted [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px] [&_code]:text-text [&_li]:mt-1 [&_p]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
          <section>
            <H id="data-sources">Data sources</H>
            <p>Production settlement uses a market-data provider abstraction. The default implementation reads USD prices from CoinGecko (asset identifiers <code>bitcoin</code>, <code>ethereum</code>, <code>solana</code>). Every stored price records the provider’s own timestamp and a <code>source</code> label.</p>
            <p>{demo ? <>This deployment is running in <strong className="text-neutral">Demo Mode</strong>: prices come from a deterministic simulator and are labelled as simulated everywhere they appear. They are not live market data.</> : <>If the provider is unavailable the interface shows “Data temporarily unavailable” rather than a fabricated value.</>}</p>
          </section>
          <section>
            <H id="snapshots">Price snapshot rules</H>
            <ul>
              <li><strong className="text-text">Start price</strong> is captured when the Battle opens (<code>opens_at</code>), from the provider’s historical price closest to that instant.</li>
              <li><strong className="text-text">Reference price</strong> is stored on every prediction at lock time for transparency; it does not affect scoring.</li>
              <li><strong className="text-text">End price</strong> is captured at or after <code>ends_at</code> from the provider’s historical price closest to the end time.</li>
              <li>Snapshots are appended to a <code>price_snapshots</code> table and never overwritten. A manual admin override creates an audit-log entry with the reason.</li>
            </ul>
          </section>
          <section>
            <H id="neutral">Neutral threshold</H>
            <p>Each Battle stores a <code>neutral_threshold_percent</code> (default {DEFAULT_NEUTRAL_THRESHOLD_PERCENT}% for a 24-hour Battle).</p>
            <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-surface-2 p-3 font-mono text-xs text-text">{`percentage_change = ((end_price - start_price) / start_price) * 100

Bullish  if percentage_change >  threshold
Bearish  if percentage_change < -threshold
Neutral  otherwise (a change exactly equal to ±threshold is Neutral)`}</pre>
          </section>
          <section>
            <H id="settlement">Settlement process</H>
            <ul>
              <li>Predictions are accepted only while <code>opens_at ≤ now &lt; locks_at</code>. Deadlines are enforced on the server and in the database, never just by the countdown.</li>
              <li>A scheduled job (and the admin console) settles Battles once <code>now ≥ ends_at</code>. The Battle moves to <code>settling</code>, which acts as a lock against concurrent runs, then to <code>settled</code>.</li>
              <li>Settlement is idempotent: a settled Battle is never settled twice, and XP is written through a ledger keyed by (user, Battle, reason) so replays cannot double-award.</li>
              <li>Correct direction = 100 Battle Score. Incorrect = 0. Confidence is recorded for calibration but does not multiply the score.</li>
            </ul>
          </section>
          <section>
            <H id="void">Void rules</H>
            <p>If required price data is unavailable or clearly invalid after retries, an administrator may void the Battle. Void Battles award no score and no XP, do not affect streaks, and are excluded from accuracy, ratings and leaderboards. Settled Battles cannot be voided; they can only be archived.</p>
          </section>
          <section>
            <H id="ai">AI profile methodology</H>
            <p>The three AI analysts are <strong className="text-text">deterministic, rule-based simulations</strong> built for the Arena. They do not call commercial model APIs. Each profile computes trailing 1-, 3- and 7-day returns, 7-day volatility and distance from the 7-day mean from prices available before the lock, then applies its published rule set:</p>
            <ul>
              {AI_PROFILES.map((p) => <li key={p.id}><span style={{ color: p.accentColor }} className="font-mono">{p.name}</span> — {p.tagline.toLowerCase()}; cites {p.prefers.join(", ")}; strategy version <code>{p.strategyVersion}</code>.</li>)}
            </ul>
            <p>AI forecasts use the same direction / three-signal / confidence / timestamp structure as human forecasts, are locked before <code>locks_at</code>, store the strategy version and a non-secret input snapshot, and are never backfilled after the end price is known. AI forecasts are not financial advice.</p>
          </section>
          <section>
            <H id="crowd">Crowd aggregation</H>
            <p>The Crowd Signal is the percentage of locked <em>human</em> predictions by direction. AI forecasts are never included. Exact percentages are revealed to a viewer only after they lock their own prediction or once the Battle is no longer accepting predictions; visitors see an obscured teaser.</p>
          </section>
          <section>
            <H id="accuracy">Accuracy calculation</H>
            <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-surface-2 p-3 font-mono text-xs text-text">{`accuracy = correct_settled_predictions / valid_settled_predictions`}</pre>
            <p>Open, pending and void predictions are excluded. The 7-day and 30-day views filter by the Battle’s end time.</p>
          </section>
          <section>
            <H id="leaderboard">Leaderboard formula</H>
            <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-surface-2 p-3 font-mono text-xs text-text">{`accuracy_component    = accuracy_percentage * 0.60          (max 60)
experience_component  = min(valid_settled / 30, 1) * 25       (max 25)
consistency_component = min(current_streak / 10, 1) * 15      (max 15)
arena_rating = round(sum, 1)                                  (max 100)`}</pre>
            <p>Analysts need at least {MIN_RANKED_BATTLES} valid settled Battles in the selected scope to be ranked. Below that they appear unranked with a provisional rating. Ties are broken by accuracy, then by settled count.</p>
          </section>
          <section>
            <H id="xp">XP, levels and badges</H>
            <ul>
              <li>Lock a valid prediction: +{XP_RULES.lock} XP · Correct prediction: +{XP_RULES.correct} XP · Three-correct streak: +{XP_RULES.streak_3} XP · Five-correct streak: +{XP_RULES.streak_5} XP · Seven valid Daily Battles completed: +{XP_RULES.seven_battles} XP (once).</li>
              <li>Levels: {LEVELS.map((l) => `${l.name} (${l.minXp})`).join(" → ")}.</li>
              <li>Badges are cosmetic and reputational only. They never carry financial value.</li>
            </ul>
          </section>
          <section>
            <H id="dna">Signal DNA</H>
            <p>Signal DNA summarises a user’s forecasting-game history: most-used signal, best-performing signal (minimum {MIN_SIGNAL_USES} settled uses), best asset (minimum {MIN_ASSET_BATTLES} Battles), accuracy by direction, confidence calibration and a market-style label. It is computed only once a user has {MIN_DNA_BATTLES} valid settled Battles; before that the profile shows “Building your Signal DNA”. Signal DNA is not evidence of trading profitability.</p>
            <p>Signal catalogue: {SIGNALS.map((s) => s.name).join(", ")}. Signals represent stated reasoning categories; the MVP does not compute live values for them.</p>
          </section>
          <section>
            <H id="limitations">Data limitations</H>
            <ul>
              <li>Provider prices are aggregates and may differ from any single exchange. Snapshot timestamps may differ from the nominal Battle time by the provider’s resolution.</li>
              <li>Direction outcomes depend on the configured threshold; a different threshold would produce different results.</li>
              <li>The Arena records forecasting-game accuracy with virtual points. It does not track portfolios, execute trades, or measure returns, and past forecasting performance does not predict future results.</li>
            </ul>
            <p className="mt-4"><Link href="/about" className="text-cyan hover:underline">About the product and its principles →</Link></p>
          </section>
        </div>
      </div>
    </>
  );
}
