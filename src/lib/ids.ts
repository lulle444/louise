let counter = 0;

/** Short unique id with a type prefix. Uses crypto when available. */
export function makeId(prefix: string): string {
  counter += 1;
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${rand}${counter.toString(36)}`;
}
