"use client";

import { formatUtc } from "@/lib/domain/format";
import { useClientValue } from "./useNow";

/**
 * Renders a UTC timestamp on the server, then upgrades to the viewer's local
 * time with a timezone label after hydration.
 */
export function LocalTime({ iso, withDate = true, className = "" }: { iso: string | null | undefined; withDate?: boolean; className?: string }) {
  const local = useClientValue(() => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const opts: Intl.DateTimeFormatOptions = withDate
      ? { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }
      : { hour: "2-digit", minute: "2-digit", timeZoneName: "short" };
    return new Intl.DateTimeFormat(undefined, opts).format(d);
  }, `${iso ?? ""}:${withDate ? "d" : "t"}`);
  if (!iso) return <span className={className}>—</span>;
  return (
    <time dateTime={iso} className={`num ${className}`} title={formatUtc(iso)} suppressHydrationWarning>
      {local ?? formatUtc(iso, withDate)}
    </time>
  );
}
