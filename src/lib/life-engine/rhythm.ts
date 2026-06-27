import type { ActivityCounters } from "../trends/types";
import type { RhythmDecision, StoryRhythm, StoryThread } from "./types";

function deltaMagnitude(d: ActivityCounters): number {
  return Object.values(d).reduce((s, v) => s + Math.abs(v ?? 0), 0);
}

/**
 * Uneven story rhythm — not every sync produces writing.
 * Bursts after heavy weeks; quiet stretches stay quiet.
 */
export function decideRhythm(input: {
  rhythm: StoryRhythm;
  syncDelta: ActivityCounters;
  hasMeaningfulChanges: boolean;
  activeThreads: StoryThread[];
  variablesHigh: boolean;
}): RhythmDecision {
  const magnitude = deltaMagnitude(input.syncDelta);
  const activeCount = input.activeThreads.filter((t) => t.status === "active").length;

  if (magnitude === 0 && !input.hasMeaningfulChanges && activeCount === 0) {
    return {
      should_write: false,
      intensity: "low",
      reason: "quiet_sync_no_activity",
    };
  }

  if (input.rhythm.quiet_sync_streak >= 4 && magnitude < 3) {
    const roll = Math.random();
    if (roll > 0.25) {
      return {
        should_write: false,
        intensity: "low",
        reason: "quiet_streak",
      };
    }
  }

  if (input.hasMeaningfulChanges || magnitude >= 10) {
    return {
      should_write: true,
      intensity: activeCount >= 2 || magnitude >= 25 ? "high" : "medium",
      reason: "meaningful_activity",
    };
  }

  if (activeCount >= 2 && input.variablesHigh) {
    return {
      should_write: true,
      intensity: "medium",
      reason: "active_threads",
    };
  }

  if (magnitude >= 3) {
    const roll = Math.random();
    if (roll < 0.55) {
      return {
        should_write: true,
        intensity: "low",
        reason: "minor_activity",
      };
    }
  }

  if (input.rhythm.entries_last_7d === 0 && magnitude > 0) {
    return {
      should_write: true,
      intensity: "medium",
      reason: "week_dry_spell_broken",
    };
  }

  if (input.rhythm.entries_last_7d >= 5) {
    const roll = Math.random();
    if (roll > 0.35) {
      return {
        should_write: false,
        intensity: "low",
        reason: "saturated_week",
      };
    }
  }

  return {
    should_write: false,
    intensity: "low",
    reason: "nothing_worth_a_page",
  };
}

export function nextRhythm(
  rhythm: StoryRhythm,
  wrote: boolean,
): StoryRhythm {
  const now = new Date().toISOString();
  return {
    last_entry_at: wrote ? now : rhythm.last_entry_at,
    entries_last_7d: wrote ? rhythm.entries_last_7d + 1 : rhythm.entries_last_7d,
    quiet_sync_streak: wrote ? 0 : rhythm.quiet_sync_streak + 1,
    last_sync_at: now,
  };
}
