/**
 * Formats a duration given in months and days into a human-readable string.
 * Examples: "1 month 15 days", "3 months", "15 days", "—"
 */
export function formatDuration(
  months: number | null | undefined,
  days: number | null | undefined
): string {
  const m = months && months > 0 ? months : 0;
  const d = days && days > 0 ? days : 0;

  if (m === 0 && d === 0) return "—";

  const parts: string[] = [];
  if (m > 0) parts.push(`${m} month${m !== 1 ? "s" : ""}`);
  if (d > 0) parts.push(`${d} day${d !== 1 ? "s" : ""}`);

  return parts.join(" ");
}
