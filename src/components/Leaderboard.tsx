import Link from "next/link";
import type { LeaderboardRow } from "@/lib/services/views";
import { Avatar } from "./Avatar";
import { NarrativeIcon } from "./NarrativeIcon";

export function Leaderboard({ rows, compact = false }: { rows: LeaderboardRow[]; compact?: boolean }) {
  if (!rows.length) {
    return <p className="card p-6 text-center text-sm text-muted">No settled results in this window yet.</p>;
  }
  return (
    <div className="card overflow-x-auto">
      <table className="table" data-testid="leaderboard">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Player</th>
            <th scope="col">Level</th>
            {!compact ? <th scope="col">Winners</th> : null}
            <th scope="col">Avg score</th>
            {!compact ? <th scope="col">Streak</th> : null}
            {!compact ? <th scope="col">Best narrative</th> : null}
            <th scope="col">Meta Rating</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.profile.id}>
              <td className="mono text-muted">{i + 1}</td>
              <td>
                <Link href={`/profile/${r.profile.username}`} className="flex items-center gap-2 hover:underline">
                  <Avatar seed={r.profile.id} name={r.profile.displayName} size={28} />
                  <span className="flex flex-col leading-tight">
                    <span className="font-medium">{r.profile.displayName}</span>
                    <span className="text-xs text-dim">@{r.profile.username}</span>
                  </span>
                </Link>
              </td>
              <td>
                <span className="text-sm">{r.level.name}</span>
                <span className="block text-xs text-dim">{r.xp} XP</span>
              </td>
              {!compact ? (
                <td className="mono">
                  {r.stats.leaderHits}/{r.stats.settledRaces}
                </td>
              ) : null}
              <td className="mono">{r.stats.averageScore.toFixed(1)}</td>
              {!compact ? <td className="mono">{r.stats.currentStreak}</td> : null}
              {!compact ? (
                <td>
                  {r.bestNarrative ? (
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <NarrativeIcon name={r.bestNarrative.icon} className="h-3.5 w-3.5" style={{ color: r.bestNarrative.accentColor }} />
                      {r.bestNarrative.shortName}
                    </span>
                  ) : (
                    <span className="text-dim">—</span>
                  )}
                </td>
              ) : null}
              <td>
                <span className="mono font-semibold">{r.stats.metaRating}</span>
                {r.stats.provisional ? (
                  <span className="ml-2 rounded border border-border px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-wider text-muted" title="Fewer than three settled Races">
                    provisional
                  </span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
