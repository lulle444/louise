import type { Badge } from "@/lib/domain/types";
import { SignalIcon } from "@/components/ui/SignalIcon";
import { formatUtc } from "@/lib/domain/format";

export function BadgeGrid({ earned, all }: { earned: Array<Badge & { awardedAt: string }>; all: Badge[] }) {
  const earnedIds = new Set(earned.map((b) => b.id));
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" aria-label="Badges">
      {all.map((b) => {
        const got = earned.find((e) => e.id === b.id);
        const has = earnedIds.has(b.id);
        return (
          <li key={b.id} className={`rounded-lg border p-3 ${has ? "border-cyan/40 bg-cyan/5" : "border-border opacity-50"}`} title={got ? `Awarded ${formatUtc(got.awardedAt)}` : "Not yet earned"}>
            <span className={`grid size-8 place-items-center rounded-md ${has ? "bg-cyan/15 text-cyan" : "bg-surface-2 text-muted"}`}><SignalIcon name={b.icon} /></span>
            <p className="mt-2 text-xs font-semibold">{b.name}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted">{b.description}</p>
            <span className="sr-only">{has ? "Earned" : "Locked"}</span>
          </li>
        );
      })}
    </ul>
  );
}
