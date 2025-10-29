/**
 * Formats a standard cache badge title with TTL minutes.
 *
 * @param ttlMinutes - Time-to-live in minutes
 * @returns Title string like "Cached • TTL 5m"
 *
 * @example
 * cacheTitle(3) // "Cached • TTL 3m"
 */
export function cacheTitle(ttlMinutes: number): string {
  return `Cached • TTL ${ttlMinutes}m`;
}
