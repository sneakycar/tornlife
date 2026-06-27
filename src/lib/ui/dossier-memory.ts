import type { InterpretationState, PlayerProfile } from "../db/types";

export interface CharacterMemory {
  narratorConfidence: number;
  knownFacts: number;
  emergingArchetypes: number;
  currentThreads: number;
}

export function buildCharacterMemory(
  profile: PlayerProfile,
  interpretation: InterpretationState | null,
): CharacterMemory {
  const canon = profile.character_state.canon;
  const canonFacts = new Set([
    ...canon.facts,
    ...canon.habits,
    ...canon.vices,
    ...(profile.canon_tags ?? []),
  ]);

  const confidences: number[] = [];
  if (interpretation) {
    for (const c of interpretation.what_changed) {
      confidences.push(c.confidence);
    }
    for (const s of interpretation.stat_interpretations) {
      confidences.push(s.confidence);
    }
  }

  const narratorConfidence =
    confidences.length > 0
      ? Math.round(
          (confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100,
        )
      : profile.initialized
        ? 68
        : 40;

  return {
    narratorConfidence,
    knownFacts: canonFacts.size,
    emergingArchetypes: interpretation?.emerging_archetypes.length ?? 0,
    currentThreads: profile.character_state.current_threads.length,
  };
}
