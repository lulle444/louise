import type { Metadata } from "next";
import { NARRATIVE_WEIGHTS, NORMALIZATION_BOUNDS } from "@/lib/scoring/narrative-score";
import { ROLE_CAPS } from "@/lib/scoring/race-score";
import { XP_RULES } from "@/lib/scoring/xp";
import { LEVELS } from "@/lib/scoring/levels";
import { BADGES } from "@/lib/scoring/badges";
import { AI_PROFILES } from "@/lib/scoring/ai";
import { MAX_CONSTITUENT_WEIGHT } from "@/lib/data/snapshots";
import { SectionHeading } from "@/components/SectionHeading";

export const metadata: Metadata = { title: "Methodology" };

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-3xl py-8">
      <SectionHeading eyebrow="Transparent by design" title="Methodology" description="Everything that moves a score is documented here and implemented as tested pure functions. Version strings are stored on every snapshot and result." />
      <div className="prose-mr">
        <h2 id="data-sources">Data sources and timestamps</h2>
        <p>
          Market data comes from a pluggable provider. In Demo Mode a deterministic mock provider generates a seeded random walk at six-hour steps, clearly labelled <em>Demo data</em> everywhere it appears. In production the provider is CoinGecko (via <code>MARKET_DATA_API_KEY</code>). Every snapshot stores its <code>source</code>, <code>takenAt</code>, constituent version and formula version. Demo values are never presented as live, and live values are never fabricated: if data is missing the narrative is marked unavailable.
        </p>

        <h2 id="constituents">Constituents and weighting</h2>
        <p>
          Each narrative has a versioned constituent set of five assets. Weights are equal and capped at {Math.round(MAX_CONSTITUENT_WEIGHT * 100)}% per asset; any excess is redistributed so a single large-cap token cannot dominate. Constituent sets are immutable during a live Race and every change creates a new version.
        </p>

        <h2 id="narrative-score">Narrative Score</h2>
        <pre>{`narrative_score = price × ${NARRATIVE_WEIGHTS.price} + breadth × ${NARRATIVE_WEIGHTS.breadth} + volume × ${NARRATIVE_WEIGHTS.volume} + momentum × ${NARRATIVE_WEIGHTS.momentum}`}</pre>
        <ul>
          <li><strong>Price performance (40%)</strong>: capped-weight average % change of constituents from the Race start, mapped linearly from {NORMALIZATION_BOUNDS.priceChangePct.min}% → 0 to +{NORMALIZATION_BOUNDS.priceChangePct.max}% → 100.</li>
          <li><strong>Market breadth (25%)</strong>: share of constituents with a positive change × 100.</li>
          <li><strong>Volume change (20%)</strong>: average volume in the window vs the equally long prior window, mapped from {NORMALIZATION_BOUNDS.volumeChangePct.min}% → 0 to +{NORMALIZATION_BOUNDS.volumeChangePct.max}% → 100.</li>
          <li><strong>Momentum consistency (15%)</strong>: share of snapshot intervals in which the weighted narrative index rose × 100.</li>
        </ul>
        <p>All components are clamped to 0–100 before weighting. The pre-lock snapshot uses the seven days before the lock; Race snapshots measure from the Race start.</p>

        <h3 id="missing-data">Missing-data rules</h3>
        <p>A narrative needs usable data for at least 60% of its constituents (minimum two). Otherwise it is marked <em>unavailable</em>, ranked last, and shown as “n/a”. If fewer than 60% of narratives have usable final data the Race cannot settle and must be voided by an admin.</p>

        <h2 id="race-score">Race Score</h2>
        <p>At settlement narratives are ordered by final Narrative Score. Starting rank is the pre-lock rank.</p>
        <table>
          <thead><tr><th>Role</th><th>Base points</th><th>Cap</th></tr></thead>
          <tbody>
            <tr><td>Leader</td><td>1st: 100 · 2nd: 40 · 3rd: 20</td><td>{ROLE_CAPS.leader}</td></tr>
            <tr><td>Challenger</td><td>Top 3: 60 · 4th: 20</td><td>{ROLE_CAPS.challenger}</td></tr>
            <tr><td>Wildcard</td><td>20 per position gained vs start, max 80</td><td>{ROLE_CAPS.wildcard}</td></tr>
          </tbody>
        </table>
        <pre>{`multiplier  = 0.5 + energy / 100          (0 → ×0.5, 100 → ×1.5)
role_points = min(cap, base × multiplier)
race_score  = leader + challenger + wildcard   (max 360)`}</pre>
        <p>Energy is virtual. Scores are produced by a pure function (<code>scoreLineup</code>) covered by unit tests. Settlement is idempotent: re-running it produces the same results and never awards XP twice.</p>

        <h2 id="void">Void Races</h2>
        <p>An admin may void a Race (for example, a data outage). Void entries award no XP, do not count toward accuracy, and neither extend nor break streaks.</p>

        <h2 id="crowd">Crowd aggregation</h2>
        <p>Crowd Picks aggregate human lineups only. AI lineups are excluded. We publish the most common pick per role, Energy-weighted conviction per narrative, a consensus lineup (top pick per role, de-duplicated, Energy re-scaled to 100) and the biggest disagreement (the role whose top two choices are closest). Crowd data is hidden from eligible players until their own lineup is locked or the Race has closed.</p>

        <h2 id="ai">AI coaches</h2>
        <p>The three coaches are deterministic rule sets (strategy version {AI_PROFILES[0].strategyVersion}), not machine learning. They draft from the pre-lock snapshot, lock at the deadline with the same three-role / 100-Energy structure, and store the snapshot id they used. They are never generated or revised after the Race starts.</p>
        <ul>
          {AI_PROFILES.map((p) => (
            <li key={p.id}><strong>{p.name}</strong> — {p.description}</li>
          ))}
        </ul>

        <h2 id="xp">XP, levels and streaks</h2>
        <table>
          <thead><tr><th>Event</th><th>XP</th></tr></thead>
          <tbody>
            {Object.entries(XP_RULES).map(([k, v]) => (
              <tr key={k}><td>{v.label}</td><td>+{v.amount}</td></tr>
            ))}
          </tbody>
        </table>
        <p>Levels: {LEVELS.map((l) => `${l.name} ${l.minXp}`).join(" · ")}.</p>

        <h2 id="badges">Badges</h2>
        <ul>
          {BADGES.map((b) => (
            <li key={b.code}><strong>{b.name}</strong> — {b.description}</li>
          ))}
        </ul>

        <h2 id="meta-rating">Meta Rating and Meta DNA</h2>
        <pre>{`meta_rating = round(avg_race_score × 4 + leader_accuracy × 300 + challenger_accuracy × 150 + wildcard_accuracy × 150)`}</pre>
        <p>Ratings are provisional until a player has three settled Races. Meta DNA needs the same sample and summarises best narrative, best role, early-discovery performance (Wildcard positions gained), conviction calibration (Energy placed on hits vs misses), consensus-vs-contrarian tendency (how often your Leader matched the crowd) and average finishing score. Labels: Early Hunter, Rotation Reader, Wildcard Scout, Consensus Navigator, Contrarian, Balanced Strategist.</p>

        <h2 id="limitations">Limitations</h2>
        <ul>
          <li>Demo Mode data is synthetic. It demonstrates the loop; it says nothing about real markets.</li>
          <li>Narrative membership is editorial. Reasonable people disagree about which assets belong where.</li>
          <li>Six-hour snapshots miss intra-interval moves; volume data from public APIs can be revised.</li>
          <li>META RACE is educational. It does not execute trades, hold funds, or give financial advice.</li>
        </ul>
      </div>
    </div>
  );
}
