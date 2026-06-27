import type { CharacterState } from "../db/types";

export interface ArchetypeMeta {
  observed_since?: string;
  previous_archetype?: string;
  reclassified_at?: string;
}

export function getArchetypeMeta(state: CharacterState): ArchetypeMeta {
  const raw = state as CharacterState & { archetype_meta?: ArchetypeMeta };
  return raw.archetype_meta ?? {};
}

/** Rare reclassification — requires sustained score lead, not one odd day. */
export function applyArchetypeMeta(
  state: CharacterState,
  previousPrimary: string,
  nextPrimary: string,
  scores: Record<string, number>,
): CharacterState {
  const meta = getArchetypeMeta(state);
  const now = new Date().toISOString();

  if (nextPrimary === previousPrimary) {
    return {
      ...state,
      archetype: nextPrimary,
      archetype_meta: {
        ...meta,
        observed_since: meta.observed_since ?? now,
      },
    } as CharacterState;
  }

  const nextScore = scores[nextPrimary] ?? 0;
  const prevScore = scores[previousPrimary] ?? 0;
  const sustainedLead = nextScore - prevScore >= 15;
  const wasClassified = previousPrimary !== "THE UNKNOWN";

  if (wasClassified && sustainedLead) {
    return {
      ...state,
      archetype: nextPrimary,
      archetype_meta: {
        observed_since: now,
        previous_archetype: previousPrimary,
        reclassified_at: now,
      },
    } as CharacterState;
  }

  return {
    ...state,
    archetype: nextPrimary,
    archetype_meta: {
      ...meta,
      observed_since: meta.observed_since ?? now,
    },
  } as CharacterState;
}
