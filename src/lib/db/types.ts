export type LoreMeterKey = "heat" | "luck" | "rot" | "rep" | "vice" | "debt";

export type LoreMeters = Record<LoreMeterKey, number>;

export interface CharacterTone {
  summary: string;
  humor: string;
  darkness: string;
  violence_level: string;
  absurdity_level: string;
  mundanity_level: string;
}

export interface ToneConstraints {
  too_violent: boolean;
  too_goofy: boolean;
  too_clean: boolean;
  too_edgy: boolean;
  more_noir: boolean;
  more_mundane: boolean;
}

export interface CanonState {
  facts: string[];
  people: string[];
  places: string[];
  possessions: string[];
  habits: string[];
  vices: string[];
  fears: string[];
  ongoing_problems: string[];
  running_jokes: string[];
}

export interface CharacterState {
  archetype: string;
  archetype_meta?: {
    observed_since?: string;
    previous_archetype?: string;
    reclassified_at?: string;
  };
  tone: CharacterTone;
  identity_notes: string[];
  calibration_notes: string[];
  tone_constraints: ToneConstraints;
  preferred_patterns: string[];
  avoid_patterns: string[];
  forbidden_references: string[];
  canon: CanonState;
  recent_mood: string;
  current_threads: string[];
  last_updated: string;
}

export interface CharacterFacts {
  username: string;
  level: number;
  rank: string;
  age: number;
  net_worth: number | null;
  money_on_hand: number | null;
  faction: string | null;
  faction_position: string | null;
  company: string | null;
  job_position: string | null;
  education: string | null;
  property: string;
  life_current: number | null;
  life_max: number | null;
  status: string;
  status_label: string;
  travel: string | null;
  crimes: number | null;
  hospitalizations: number | null;
  jailed: number | null;
  attacks_won: number | null;
  travel_times: number | null;
  donations: number | null;
  drugs: number | null;
  alcohol_used: number | null;
}

export interface StatInterpretation {
  key: string;
  label: string;
  fact: string;
  interpretation: string;
  reasoning: string;
  confidence: number;
}

export interface EmergingArchetype {
  name: string;
  percentage: number;
  trend: "growing" | "stable" | "fading";
}

export interface InterpretedChange {
  field: string;
  title: string;
  fact_line: string;
  interpretation: string;
  reasoning: string;
  confidence: number;
}

export interface InterpretationState {
  primary_archetype: string;
  character_state_summary: string;
  narrator_assessment: string;
  emerging_archetypes: EmergingArchetype[];
  stat_interpretations: StatInterpretation[];
  what_changed: InterpretedChange[];
  discoveries: string[];
  recent_observations: string[];
}

export const DEFAULT_INTERPRETATION_STATE: InterpretationState = {
  primary_archetype: "THE UNKNOWN",
  character_state_summary: "",
  narrator_assessment: "",
  emerging_archetypes: [],
  stat_interpretations: [],
  what_changed: [],
  discoveries: [],
  recent_observations: [],
};

export type FileNoteStatus =
  | "active"
  | "faded"
  | "confirmed"
  | "disputed"
  | "archived";

export interface FileNote {
  id: string;
  text: string;
  added_at: string;
  status: FileNoteStatus;
  annotation?: string;
}

export interface AssessmentData {
  assessment_text: string;
  traits: string[];
  habits: string[];
  vices: string[];
  fears: string[];
  locations: string[];
  ongoing_problems: string[];
  tone: CharacterTone;
}

export type EntryType = "assessment" | "reactive" | "ambient" | "initial" | "selected";

export type FeedbackStatus =
  | "none"
  | "kept"
  | "rejected"
  | "superseded"
  | "rewritten"
  | "positive_example"
  | "negative_example";

export type GenerationTrigger =
  | "first_run"
  | "snapshot_change"
  | "ambient"
  | "assessment"
  | "lock"
  | "rewrite"
  | "feedback"
  | "selection";

export type CalibrationNote = {
  type: "quick" | "freeform";
  value: string;
  created_at: string;
};

export interface PlayerProfile {
  id: string;
  torn_user_id: number | null;
  username: string;
  civilian_name: string | null;
  age: number | null;
  archetype: string;
  secondary_archetypes: string[];
  emerging_archetypes: string[];
  archetype_scores: Record<string, number>;
  player_tags: string[];
  canon_tags: string[];
  blocked_tags: string[];
  preferred_tags: string[];
  lore_meters: LoreMeters;
  character_state: CharacterState;
  assessment_data: AssessmentData | null;
  file_notes: FileNote[];
  character_facts: CharacterFacts | null;
  interpretation_state: InterpretationState | null;
  character_locked: boolean;
  calibration_notes: CalibrationNote[];
  assessment_version: number;
  initialized: boolean;
  last_sync_at: string | null;
  last_ambient_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TornSnapshot {
  id: string;
  player_id: string;
  raw_data: Record<string, unknown>;
  normalized_summary: NormalizedSummary;
  created_at: string;
}

export interface LifeEntry {
  id: string;
  player_id: string;
  content: string;
  entry_type: EntryType;
  feedback_status: FeedbackStatus;
  superseded_by: string | null;
  feedback_notes: unknown[];
  is_canon: boolean;
  source_type: string | null;
  source_summary: Record<string, unknown> | null;
  tone_tags: string[];
  created_at: string;
}

export interface EntryFeedback {
  id: string;
  life_entry_id: string;
  player_profile_id: string;
  feedback_type: string;
  feedback_note: string | null;
  applied: boolean;
  resulting_entry_id: string | null;
  state_patch: Record<string, unknown> | null;
  created_at: string;
}

export interface GenerationRun {
  id: string;
  player_id: string;
  trigger_type: GenerationTrigger;
  input_summary: Record<string, unknown>;
  output_summary: Record<string, unknown>;
  tokens_used: number | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface NormalizedSummary {
  tornUserId: number;
  username: string;
  age: number;
  level: number;
  rank: string;
  status: string;
  statusDescription: string;
  location: string | null;
  job: string | null;
  education: string | null;
  faction: string | null;
  maritalStatus: string | null;
  characterFacts: CharacterFacts;
  activitySignals: ActivitySignal[];
  comparisonKeys: Record<string, string | number | boolean | null>;
}

export interface ActivitySignal {
  category: string;
  signal: string;
  weight: number;
}

export const DEFAULT_TONE: CharacterTone = {
  summary: "",
  humor: "dry",
  darkness: "moderate",
  violence_level: "low",
  absurdity_level: "low",
  mundanity_level: "high",
};

export const DEFAULT_TONE_CONSTRAINTS: ToneConstraints = {
  too_violent: false,
  too_goofy: false,
  too_clean: false,
  too_edgy: false,
  more_noir: false,
  more_mundane: false,
};

export const DEFAULT_CANON: CanonState = {
  facts: [],
  people: [],
  places: [],
  possessions: [],
  habits: [],
  vices: [],
  fears: [],
  ongoing_problems: [],
  running_jokes: [],
};

export const DEFAULT_LORE_METERS: LoreMeters = {
  heat: 50,
  luck: 50,
  rot: 50,
  rep: 50,
  vice: 50,
  debt: 50,
};

export const DEFAULT_CHARACTER_STATE: CharacterState = {
  archetype: "THE UNKNOWN",
  tone: DEFAULT_TONE,
  identity_notes: [],
  calibration_notes: [],
  tone_constraints: DEFAULT_TONE_CONSTRAINTS,
  preferred_patterns: [],
  avoid_patterns: [],
  forbidden_references: [],
  canon: DEFAULT_CANON,
  recent_mood: "unsettled",
  current_threads: [],
  last_updated: new Date().toISOString(),
};

export const QUICK_CORRECTIONS = [
  "Too violent",
  "Too goofy",
  "Too clean",
  "Too pathetic",
  "Too rich",
  "Too evil",
  "More tragic",
  "More funny",
  "More noir",
  "More mundane",
  "More criminal",
  "Less criminal",
  "More pathetic",
  "Less pathetic",
  "More grounded",
  "Less edgy",
  "More washed-up",
  "More competent",
] as const;

export const ENTRY_FEEDBACK_OPTIONS = [
  "Keep",
  "Too violent",
  "Too silly",
  "Too edgy",
  "Too boring",
  "Too clean",
  "Too mean",
  "Too random",
  "Too dramatic",
  "Too generic",
  "Doesn't sound like him",
  "More like this",
  "Less like this",
  "Make it darker",
  "Make it funnier",
  "Make it more mundane",
  "Never reference this again",
] as const;
