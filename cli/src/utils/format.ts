/**
 * Formats a duration in milliseconds into a human-readable string.
 * 
 * Examples:
 * - 1000 -> "1s"
 * - 60000 -> "1m"
 * - 90000 -> "1m 30s"
 * - 3600000 -> "1h"
 * - 5400000 -> "1h 30m"
 * - 86400000 -> "1d"
 * - 129600000 -> "1d 12h"
 * 
 * Zero components are omitted. Negative values return "0s".
 */
export function formatDuration(ms: number): string {
  if (ms <= 0) {
    return "0s";
  }

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }

  if (remainingHours > 0) {
    parts.push(`${remainingHours}h`);
  }

  if (remainingMinutes > 0) {
    parts.push(`${remainingMinutes}m`);
  }

  if (remainingSeconds > 0 && days === 0) {
    // Only show seconds if less than a day (to keep output concise)
    parts.push(`${remainingSeconds}s`);
  }

  if (parts.length === 0) {
    return "0s";
  }

  return parts.join(" ");
}
