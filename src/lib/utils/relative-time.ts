import {
  formatDistanceToNowStrict,
  isToday,
  isYesterday,
  differenceInDays,
} from "date-fns";

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  if (diffMs < 60_000) return "Just now";
  if (diffMs < 3_600_000) {
    return formatDistanceToNowStrict(d, { addSuffix: true });
  }
  if (isToday(d)) {
    return formatDistanceToNowStrict(d, { addSuffix: true });
  }
  if (isYesterday(d)) return "Yesterday";
  const days = differenceInDays(now, d);
  if (days < 7) return `${days} days ago`;
  return formatDistanceToNowStrict(d, { addSuffix: true });
}
