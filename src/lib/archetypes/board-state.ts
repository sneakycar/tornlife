import type { EmergingArchetype, PlayerProfile } from "../db/types";
import type { FileNoticedItem } from "../trends/file-noticed";
import { ARCHETYPE_CATALOG, getArchetypeByName } from "./catalog";

export type ArchetypeBoardTier = "current" | "drifting" | "nearby" | "distant";

export interface ArchetypeBoardCell {
  name: string;
  tier: ArchetypeBoardTier;
  opacity: number;
  score: number;
}

export interface ArchetypeClassification {
  current: string;
  observedDays: number;
  confidenceLabel: string;
  driftingToward: string[];
  driftExplanation: string;
  previousArchetype: string | null;
  reclassified: boolean;
}

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function confidenceLabel(scores: Record<string, number>, primary: string): string {
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const top = ranked.find(([n]) => n === primary)?.[1] ?? 0;
  const second = ranked.find(([n]) => n !== primary)?.[1] ?? 0;
  const gap = top - second;
  if (gap >= 25) return "Confidence high.";
  if (gap >= 12) return "Confidence increasing.";
  return "Confidence provisional.";
}

function driftExplanation(
  drifting: string[],
  fileNoticed: FileNoticedItem[],
): string {
  if (fileNoticed.length > 0) {
    return `Recent activity suggests ${fileNoticed[0].line.charAt(0).toLowerCase()}${fileNoticed[0].line.slice(1)}`;
  }
  if (drifting.length > 0) {
    const names = drifting.slice(0, 2).join(" and ");
    return `Behavior over time is pulling toward ${names}.`;
  }
  return "The classification is stable for now.";
}

export function buildArchetypeBoard(
  profile: PlayerProfile,
  emerging: EmergingArchetype[],
): ArchetypeBoardCell[] {
  const scores = profile.archetype_scores ?? {};
  const primary = profile.archetype;
  const driftingNames = new Set<string>();

  for (const e of emerging) {
    if (e.trend === "growing") driftingNames.add(e.name);
  }
  for (const s of profile.secondary_archetypes ?? []) {
    driftingNames.add(s);
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topNeighbors = ranked
    .filter(([name]) => name !== primary)
    .slice(0, 3)
    .map(([name]) => name);

  return ARCHETYPE_CATALOG.filter((a) => a.id !== "unknown").map((def) => {
    const score = scores[def.name] ?? 0;
    let tier: ArchetypeBoardTier = "distant";
    let opacity = 0.14;

    if (def.name === primary) {
      tier = "current";
      opacity = 1;
    } else if (driftingNames.has(def.name)) {
      tier = "drifting";
      opacity = 0.62;
    } else if (topNeighbors.includes(def.name) || score >= 35) {
      tier = "nearby";
      opacity = 0.38;
    }

    return { name: def.name, tier, opacity, score };
  });
}

export function buildArchetypeClassification(
  profile: PlayerProfile,
  emerging: EmergingArchetype[],
  fileNoticed: FileNoticedItem[],
): ArchetypeClassification {
  const meta = profile.character_state.archetype_meta;

  const observedSince =
    meta?.observed_since ?? profile.created_at;
  const observedDays = daysSince(observedSince);

  const driftingToward = [
    ...new Set([
      ...emerging.filter((e) => e.trend === "growing").map((e) => e.name),
      ...(profile.secondary_archetypes ?? []).filter(
        (n) => n !== profile.archetype,
      ),
    ]),
  ].slice(0, 3);

  const previousArchetype = meta?.previous_archetype ?? null;
  const reclassified =
    !!previousArchetype &&
    previousArchetype !== profile.archetype &&
    !!meta?.reclassified_at;

  return {
    current: profile.archetype,
    observedDays,
    confidenceLabel: confidenceLabel(profile.archetype_scores ?? {}, profile.archetype),
    driftingToward,
    driftExplanation: driftExplanation(driftingToward, fileNoticed),
    previousArchetype: reclassified ? previousArchetype : null,
    reclassified,
  };
}

export function archetypeGlyph(name: string): string {
  return getArchetypeByName(name)?.glyph ?? "·";
}

export function archetypeAccent(name: string): string {
  return getArchetypeByName(name)?.accent ?? "#4a4a52";
}
