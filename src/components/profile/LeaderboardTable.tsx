import Link from "next/link";
import type { LeaderboardRow } from "@/lib/services/stats";
import { formatAccuracy } from "@/lib/domain/format";
import { Avatar } from "@/components/ui/Avatar";

export function LeaderboardTable({ rows, highlightUserId }: { rows: LeaderboardRow[]; highlightUserId?: string | null }) {
  return (
    <div className="card overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted">
            <th scope="col" className="px-4 py-3">Rank</th>
            <th scope="col" className="px-4 py-3">Analyst</th>
            <th scope="col" className="px-4 py-3">Level</th>
            <th scope="col" className="px-4 py-3 text-right">Accuracy</th>
            <th scope="col" className="px-4 py-3 text-right">Settled</th>
            <th scope="col" className="px-4 py-3 text-right">Streak</th>
            <th scope="col" className="px-4 py-3">Best signal</th>
            <th scope="col" className="px-4 py-3 text-right">Arena rating</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.profile.id} className={`border-b border-border/60 ${highlightUserId === r.profile.id ? "bg-cyan/5" : ""} ${!r.ranked ? "text-muted" : ""}`}>
              <td className="num px-4 py-3">{r.rank ?? <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider">Unranked</span>}</td>
              <td className="px-4 py-3">
                <Link href={`/profile/${r.profile.username}`} className="inline-flex items-center gap-2 hover:underline">
                  <Avatar name={r.profile.displayName} size="sm" />
                  <span>
                    <span className="block text-text">{r.profile.displayName}</span>
                    <span className="block font-mono text-[11px] text-muted">@{r.profile.username}</span>
                  </span>
                </Link>
              </td>
              <td className="px-4 py-3"><span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">L{r.level.level} {r.level.name}</span></td>
              <td className="num px-4 py-3 text-right">{formatAccuracy(r.accuracy)}</td>
              <td className="num px-4 py-3 text-right">{r.settled}</td>
              <td className="num px-4 py-3 text-right">{r.streak > 0 ? <span className="text-bull">{r.streak}</span> : "0"}</td>
              <td className="px-4 py-3 text-xs">{r.bestSignal ?? "—"}</td>
              <td className="num px-4 py-3 text-right font-semibold text-text">{r.rating.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
