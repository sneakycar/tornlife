import type { ActivityCounters } from "../trends/types";

export type LifeWindowKey = "today" | "days7" | "days30" | "days90" | "lifetime";

export interface RollingWindows {
  today: ActivityCounters;
  days7: ActivityCounters;
  days30: ActivityCounters;
  days90: ActivityCounters;
  lifetime: ActivityCounters;
}

/** Invisible life variables — accumulated behavior shapes future writing. */
export interface LifeVariables {
  chemical_routine: number;
  social_isolation: number;
  washed_up_potential: number;
  vice_pressure: number;
  discipline: number;
  obsession: number;
  durability: number;
  professionalism: number;
  drifter: number;
  risk_tolerance: number;
  luck_dependence: number;
  financial_instability: number;
  routine: number;
  respectability: number;
  business_instinct: number;
  criminal_identity: number;
  heat_accumulation: number;
  desensitization: number;
  paranoia: number;
  confidence: number;
}

export interface StoryRhythm {
  last_entry_at: string | null;
  entries_last_7d: number;
  quiet_sync_streak: number;
  last_sync_at: string | null;
}

export interface LifeEngineState {
  variables: LifeVariables;
  rhythm: StoryRhythm;
  windows: RollingWindows;
  consequence_tags: string[];
  updated_at: string | null;
}

export interface StoryThread {
  id: string;
  thread_key: string;
  label: string;
  status: "active" | "fading" | "dormant";
  intensity: number;
  started_at: string;
  last_reinforced_at: string;
  evidence: Record<string, unknown>;
}

export interface MemoryBeat {
  id: string;
  recorded_at: string;
  window_key: string;
  activity_key: string;
  reality_line: string;
  narrative_line: string;
  tags: string[];
  intensity: number;
}

export interface LifeEngineSnapshot {
  state: LifeEngineState;
  threads: StoryThread[];
  memory: MemoryBeat[];
  callbacks: string[];
  writingTags: string[];
  rhythmDecision: RhythmDecision;
}

export interface RhythmDecision {
  should_write: boolean;
  intensity: "low" | "medium" | "high";
  reason: string;
}

export const LIFE_VARIABLE_KEYS = [
  "chemical_routine",
  "social_isolation",
  "washed_up_potential",
  "vice_pressure",
  "discipline",
  "obsession",
  "durability",
  "professionalism",
  "drifter",
  "risk_tolerance",
  "luck_dependence",
  "financial_instability",
  "routine",
  "respectability",
  "business_instinct",
  "criminal_identity",
  "heat_accumulation",
  "desensitization",
  "paranoia",
  "confidence",
] as const;

export type LifeVariableKey = (typeof LIFE_VARIABLE_KEYS)[number];
