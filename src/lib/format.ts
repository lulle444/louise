const DAY = 86_400_000;

export function formatDate(value: string | null | undefined, options: Intl.DateTimeFormatOptions = {}): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC", ...options });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`;
}

export function daysBetween(from: string | Date, to: string | Date = new Date()): number {
  const a = typeof from === "string" ? new Date(from) : from;
  const b = typeof to === "string" ? new Date(to) : to;
  return Math.round((b.getTime() - a.getTime()) / DAY);
}

/** Neutral relative phrasing, e.g. "3 days ago", "in 12 days", "today". */
export function formatRelative(value: string | null | undefined, now: Date = new Date()): string {
  if (!value) return "—";
  const diff = daysBetween(now, value);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  if (diff > 0) return diff < 60 ? `in ${diff} days` : `in ${Math.round(diff / 30)} months`;
  const ago = -diff;
  return ago < 60 ? `${ago} days ago` : `${Math.round(ago / 30)} months ago`;
}

export function percent(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${Math.round(value)}%`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function truncate(text: string, max = 140): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function isoDateOnly(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
