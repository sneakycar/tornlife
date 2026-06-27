import type { ContentSeed, SelectedContentRow } from "./types";

export function isOnCooldown(
  seed: ContentSeed,
  history: SelectedContentRow[],
  now = Date.now(),
): boolean {
  const playerHistory = history.filter((h) => h.content_seed_id === seed.id);
  if (!playerHistory.length) return false;

  const msPerDay = 1000 * 60 * 60 * 24;

  if (seed.repeat_cooldown_days > 0) {
    const latest = playerHistory
      .map((h) => new Date(h.selected_at).getTime())
      .sort((a, b) => b - a)[0];
    if (now - latest < seed.repeat_cooldown_days * msPerDay) return true;
  }

  if (seed.global_cooldown_days > 0) {
    const anyLatest = history
      .filter((h) => h.content_seed_id === seed.id)
      .map((h) => new Date(h.selected_at).getTime())
      .sort((a, b) => b - a)[0];
    if (anyLatest && now - anyLatest < seed.global_cooldown_days * msPerDay) {
      return true;
    }
  }

  return false;
}

export function recentlyUsedPenalty(
  seed: ContentSeed,
  history: SelectedContentRow[],
  now = Date.now(),
): number {
  const recent = history.find((h) => h.content_seed_id === seed.id);
  if (!recent) return 0;
  const days = (now - new Date(recent.selected_at).getTime()) / (1000 * 60 * 60 * 24);
  if (days < 3) return 40;
  if (days < 7) return 25;
  if (days < 14) return 12;
  return 0;
}
