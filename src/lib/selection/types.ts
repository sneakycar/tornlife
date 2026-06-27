import type { ContentType, EventFamily } from "./constants";
import type { LoreMeters, NormalizedSummary } from "../db/types";
import type { ChangeSummary } from "../snapshot/compare";
import type { FactChange } from "../snapshot/fact-changes";

export interface ContentSeed {
  id: string;
  text: string;
  content_type: ContentType;
  event_family: EventFamily | string;
  archetype_tags: string[];
  state_tags: string[];
  required_tags: string[];
  blocked_tags: string[];
  canon_required_tags: string[];
  canon_blocked_tags: string[];
  tone_tags: string[];
  meter_min: Partial<LoreMeters>;
  meter_max: Partial<LoreMeters>;
  weight: number;
  rarity: string;
  repeat_cooldown_days: number;
  global_cooldown_days: number;
  quality_score: number;
  approved: boolean;
  active: boolean;
}

export interface SelectedContentRow {
  id: string;
  player_profile_id: string;
  content_seed_id: string | null;
  selected_at: string;
  content_type: string;
  event_family: string;
  selection_context: Record<string, unknown>;
  display_text: string;
  was_pinned_canon: boolean;
  feedback_status: string;
}

export interface SelectionContext {
  playerTags: string[];
  canonTags: string[];
  blockedTags: string[];
  preferredTags: string[];
  archetypeTags: string[];
  loreMeters: LoreMeters;
  eventFamily: EventFamily | string;
  summary?: NormalizedSummary;
  changes?: ChangeSummary;
  factChanges?: FactChange[];
}

export interface ScoredCandidate {
  seed: ContentSeed;
  score: number;
}

export interface SelectionResult {
  seed: ContentSeed;
  displayText: string;
  score: number;
}
