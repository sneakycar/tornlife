import type { LoreMeterKey } from "../db/types";

export interface TraitDefinition {
  key: LoreMeterKey;
  label: string;
  color: string;
  sentence: string;
}

/** Fixed trait copy — one sentence each, file-voice explanations. */
export const TRAIT_DEFINITIONS: TraitDefinition[] = [
  {
    key: "heat",
    label: "HEAT",
    color: "#c44b37",
    sentence: "How much trouble is actively looking for this character.",
  },
  {
    key: "luck",
    label: "LUCK",
    color: "#c9a227",
    sentence: "Whether outcomes lately lean cruel or generous.",
  },
  {
    key: "rot",
    label: "ROT",
    color: "#6b8f5e",
    sentence: "How much damage and wear is accumulating in the body and habits.",
  },
  {
    key: "rep",
    label: "REP",
    color: "#4a7a9b",
    sentence: "How loudly the city remembers this name.",
  },
  {
    key: "vice",
    label: "VICE",
    color: "#8b4a9b",
    sentence: "How dependent the routine has become on chemicals and excess.",
  },
  {
    key: "debt",
    label: "DEBT",
    color: "#9b4a4a",
    sentence: "How tight money feels against the life being lived.",
  },
];

export function filledPipCount(value: number): number {
  const clamped = Math.max(0, Math.min(100, value));
  return Math.round(clamped / 10);
}
