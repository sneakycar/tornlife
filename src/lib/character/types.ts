import { z } from "zod";
import type {
  AssessmentData,
  CalibrationNote,
  CanonState,
  CharacterState,
  CharacterTone,
  LoreMeters,
  LoreMeterKey,
  ToneConstraints,
} from "../db/types";
import {
  DEFAULT_CANON,
  DEFAULT_CHARACTER_STATE,
  DEFAULT_LORE_METERS,
  DEFAULT_TONE,
  DEFAULT_TONE_CONSTRAINTS,
} from "../db/types";

export const loreMetersSchema = z.object({
  heat: z.number().min(0).max(100),
  luck: z.number().min(0).max(100),
  rot: z.number().min(0).max(100),
  rep: z.number().min(0).max(100),
  vice: z.number().min(0).max(100),
  debt: z.number().min(0).max(100),
});

export const characterToneSchema = z.object({
  summary: z.string(),
  humor: z.string(),
  darkness: z.string(),
  violence_level: z.string(),
  absurdity_level: z.string(),
  mundanity_level: z.string(),
});

export const toneConstraintsSchema = z.object({
  too_violent: z.boolean(),
  too_goofy: z.boolean(),
  too_clean: z.boolean(),
  too_edgy: z.boolean(),
  more_noir: z.boolean(),
  more_mundane: z.boolean(),
});

export const canonStateSchema = z.object({
  facts: z.array(z.string()),
  people: z.array(z.string()),
  places: z.array(z.string()),
  possessions: z.array(z.string()),
  habits: z.array(z.string()),
  vices: z.array(z.string()),
  fears: z.array(z.string()),
  ongoing_problems: z.array(z.string()),
  running_jokes: z.array(z.string()),
});

export const characterStateSchema = z.object({
  archetype: z.string(),
  tone: characterToneSchema,
  identity_notes: z.array(z.string()),
  calibration_notes: z.array(z.string()),
  tone_constraints: toneConstraintsSchema,
  preferred_patterns: z.array(z.string()),
  avoid_patterns: z.array(z.string()),
  forbidden_references: z.array(z.string()),
  canon: canonStateSchema,
  recent_mood: z.string(),
  current_threads: z.array(z.string()),
  last_updated: z.string(),
});

export const assessmentOutputSchema = z.object({
  archetype: z.string(),
  age: z.number().nullable(),
  meters: loreMetersSchema,
  assessment_text: z.string(),
  traits: z.array(z.string()).min(3).max(6),
  habits: z.array(z.string()).min(2).max(5),
  vices: z.array(z.string()).min(1).max(3),
  fears: z.array(z.string()).min(1).max(3),
  locations: z.array(z.string()),
  ongoing_problems: z.array(z.string()),
  tone: characterToneSchema,
  character_state: characterStateSchema,
});

export const entryItemSchema = z.object({
  text: z.string(),
  source_type: z.string(),
  tone_tags: z.array(z.string()),
  canon_candidates: z.array(z.string()),
});

export const entryGenerationSchema = z.object({
  entries: z.array(entryItemSchema).min(1).max(2),
  character_state_patch: characterStateSchema.partial(),
});

export const rewriteOutputSchema = z.object({
  replacement_text: z.string(),
  tone_tags: z.array(z.string()),
  canon_candidates: z.array(z.string()),
  character_state_patch: characterStateSchema.partial(),
});

export type AssessmentOutput = z.infer<typeof assessmentOutputSchema>;
export type EntryGenerationOutput = z.infer<typeof entryGenerationSchema>;
export type RewriteOutput = z.infer<typeof rewriteOutputSchema>;

export function clampLoreMeters(meters: LoreMeters): LoreMeters {
  const result = { ...meters };
  for (const key of Object.keys(result) as LoreMeterKey[]) {
    result[key] = Math.max(0, Math.min(100, Math.round(result[key])));
  }
  return result;
}

function mergeList(a: string[], b: string[], max = 20): string[] {
  return [...new Set([...a, ...b])].slice(-max);
}

export function mergeCanon(existing: CanonState, patch: Partial<CanonState>): CanonState {
  return {
    facts: mergeList(existing.facts, patch.facts ?? []),
    people: mergeList(existing.people, patch.people ?? []),
    places: mergeList(existing.places, patch.places ?? []),
    possessions: mergeList(existing.possessions, patch.possessions ?? []),
    habits: mergeList(existing.habits, patch.habits ?? []),
    vices: mergeList(existing.vices, patch.vices ?? []),
    fears: mergeList(existing.fears, patch.fears ?? []),
    ongoing_problems: mergeList(existing.ongoing_problems, patch.ongoing_problems ?? []),
    running_jokes: mergeList(existing.running_jokes, patch.running_jokes ?? []),
  };
}

export function mergeCharacterState(
  existing: CharacterState,
  patch: Partial<CharacterState>,
): CharacterState {
  return {
    archetype: patch.archetype ?? existing.archetype,
    tone: patch.tone ? { ...existing.tone, ...patch.tone } : existing.tone,
    identity_notes: mergeList(existing.identity_notes, patch.identity_notes ?? []),
    calibration_notes: mergeList(existing.calibration_notes, patch.calibration_notes ?? []),
    tone_constraints: patch.tone_constraints
      ? { ...existing.tone_constraints, ...patch.tone_constraints }
      : existing.tone_constraints,
    preferred_patterns: mergeList(existing.preferred_patterns, patch.preferred_patterns ?? []),
    avoid_patterns: mergeList(existing.avoid_patterns, patch.avoid_patterns ?? []),
    forbidden_references: mergeList(
      existing.forbidden_references,
      patch.forbidden_references ?? [],
    ),
    canon: patch.canon ? mergeCanon(existing.canon, patch.canon) : existing.canon,
    recent_mood: patch.recent_mood ?? existing.recent_mood,
    current_threads: mergeList(existing.current_threads, patch.current_threads ?? []),
    last_updated: new Date().toISOString(),
  };
}

export function applyToneConstraint(
  constraints: ToneConstraints,
  feedback: string,
): ToneConstraints {
  const next = { ...constraints };
  const lower = feedback.toLowerCase();
  if (lower.includes("violent")) next.too_violent = true;
  if (lower.includes("goofy") || lower.includes("silly")) next.too_goofy = true;
  if (lower.includes("clean")) next.too_clean = true;
  if (lower.includes("edgy")) next.too_edgy = true;
  if (lower.includes("noir") || lower.includes("darker")) next.more_noir = true;
  if (lower.includes("mundane")) next.more_mundane = true;
  return next;
}

export function assessmentToData(output: AssessmentOutput): AssessmentData {
  return {
    assessment_text: output.assessment_text,
    traits: output.traits,
    habits: output.habits,
    vices: output.vices,
    fears: output.fears,
    locations: output.locations,
    ongoing_problems: output.ongoing_problems,
    tone: output.tone,
  };
}

export function driftLoreMeters(
  current: LoreMeters,
  next?: Partial<LoreMeters>,
): LoreMeters {
  if (!next) return current;
  const result = { ...current };
  for (const key of Object.keys(next) as LoreMeterKey[]) {
    const value = next[key];
    if (typeof value === "number") {
      result[key] = current[key] + (value - current[key]) * 0.35;
    }
  }
  return clampLoreMeters(result);
}

function migrateLegacyState(raw: Record<string, unknown>): CharacterState {
  return {
    ...DEFAULT_CHARACTER_STATE,
    archetype: (raw.archetype as string) ?? DEFAULT_CHARACTER_STATE.archetype,
    recent_mood: (raw.mood as string) ?? (raw.recent_mood as string) ?? "unsettled",
    canon: {
      ...DEFAULT_CANON,
      habits: (raw.habits as string[]) ?? [],
      vices: (raw.vices as string[]) ?? [],
      places: (raw.favoriteLocations as string[]) ?? [],
      ongoing_problems: (raw.ongoingProblems as string[]) ?? [],
      people: [...((raw.friends as string[]) ?? []), ...((raw.enemies as string[]) ?? [])],
      possessions: (raw.possessions as string[]) ?? [],
      running_jokes: (raw.runningJokes as string[]) ?? [],
    },
    current_threads: (raw.unfinishedSituations as string[]) ?? [],
    identity_notes: (raw.personalityNotes as string[]) ?? [],
    last_updated: new Date().toISOString(),
  };
}

export function parseCharacterState(raw: unknown): CharacterState {
  const parsed = characterStateSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  if (raw && typeof raw === "object" && "mood" in (raw as object)) {
    return migrateLegacyState(raw as Record<string, unknown>);
  }
  return DEFAULT_CHARACTER_STATE;
}

export function parseLoreMeters(raw: unknown): LoreMeters {
  const parsed = loreMetersSchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_LORE_METERS;
}

export function parseAssessmentData(raw: unknown): AssessmentData | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!r.assessment_text) return null;
  return {
    assessment_text: r.assessment_text as string,
    traits: (r.traits as string[]) ?? [],
    habits: (r.habits as string[]) ?? [],
    vices: (r.vices as string[]) ?? [],
    fears: (r.fears as string[]) ?? [],
    locations: (r.locations as string[]) ?? [],
    ongoing_problems: (r.ongoing_problems as string[]) ?? [],
    tone: (r.tone as CharacterTone) ?? DEFAULT_TONE,
  };
}

export function parseCalibrationNotes(raw: unknown): CalibrationNote[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (n): n is CalibrationNote =>
      typeof n === "object" &&
      n !== null &&
      "value" in n &&
      typeof (n as CalibrationNote).value === "string",
  );
}

export function addCanonFacts(
  state: CharacterState,
  candidates: string[],
): CharacterState {
  return mergeCharacterState(state, {
    canon: mergeCanon(state.canon, { facts: candidates }),
  });
}

export function removeCanonFromEntry(
  state: CharacterState,
  facts: string[],
): CharacterState {
  const remove = new Set(facts.map((f) => f.toLowerCase()));
  return {
    ...state,
    canon: {
      ...state.canon,
      facts: state.canon.facts.filter((f) => !remove.has(f.toLowerCase())),
    },
    last_updated: new Date().toISOString(),
  };
}
