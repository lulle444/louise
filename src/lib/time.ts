/** Request-time clock for Server Components (rendered per request, never memoized across renders). */
export function requestNow(): number {
  return Date.now();
}
