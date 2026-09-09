import type { Direction } from "./types";

export function formatPrice(price: number | null | undefined, decimals = 2): string {
  if (price === null || price === undefined || !Number.isFinite(price)) return "—";
  return price.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(value: number | null | undefined, decimals = 2, signed = true): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatAccuracy(accuracy: number | null | undefined): string {
  if (accuracy === null || accuracy === undefined) return "—";
  return `${Math.round(accuracy * 100)}%`;
}

export function formatUtc(iso: string | null | undefined, withDate = true): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  if (!withDate) return `${hh}:${mm} UTC`;
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${da} ${hh}:${mm} UTC`;
}

export function directionLabel(d: Direction | null | undefined): string {
  if (!d) return "—";
  return d.charAt(0).toUpperCase() + d.slice(1);
}

export function directionGlyph(d: Direction): string {
  return d === "bullish" ? "▲" : d === "bearish" ? "▼" : "◆";
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return "0m";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatCompactNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function initials(name: string): string {
  const parts = name.replace(/[_-]+/g, " ").trim().split(/\s+/);
  const letters = parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase());
  return letters.join("") || "?";
}

export function battleDurationLabel(opensAt: string, endsAt: string): string {
  const hours = Math.round((Date.parse(endsAt) - Date.parse(opensAt)) / 3600000);
  if (hours % 24 === 0) return `${hours / 24 * 24}H`;
  return `${hours}H`;
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
