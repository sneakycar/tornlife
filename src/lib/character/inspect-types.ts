import type { LoreMeters, NormalizedSummary, PlayerProfile } from "../db/types";
import type { ChangeSummary } from "../snapshot/compare";
import type { FactChange } from "../snapshot/fact-changes";
import type { ContentType } from "../selection/constants";
import type { ArchetypeResult } from "../selection/archetypes";
import type { SelectionContext } from "../selection/types";
import type { DataCoverageReport } from "../trends/types";

export interface SelectionProbe {
  contentType: ContentType;
  eventFamiliesQueried: string[];
  poolSize: number;
  eligibleCount: number;
  relaxLevel: number;
  topCandidates: Array<{
    seedId: string;
    text: string;
    score: number;
    eventFamily: string;
    toneTags: string[];
  }>;
  wouldSelect: string | null;
}

export interface EngineInspection {
  inspectedAt: string;
  username: string;
  tornUserId: number | null;
  characterLocked: boolean;

  normalizedSummary: NormalizedSummary | null;
  snapshotAt: string | null;

  meaningfulChanges: boolean;
  changes: ChangeSummary["changes"];
  narrativeHints: string[];
  factChanges: FactChange[];

  playerTags: string[];
  eventFamily: string;
  eventFamilyChain: string[];

  archetypes: ArchetypeResult;
  archetypeScoresStored: Record<string, number>;
  loreMetersStored: LoreMeters;
  loreMetersComputed: LoreMeters;

  selectionContext: {
    canonTags: string[];
    blockedTags: string[];
    preferredTags: string[];
    archetypeTags: string[];
  };

  selectionProbes: SelectionProbe[];
  recentHistory: Array<{
    id: string;
    contentType: string;
    eventFamily: string;
    displayText: string;
    selectedAt: string;
    feedbackStatus: string;
  }>;

  libraryStats: {
    approvedSeeds: number;
  };

  dataCoverage: DataCoverageReport;
}

export function isEngineDebugEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_TORNLIFE_DEBUG === "true") return true;
  if (process.env.TORNLIFE_DEBUG === "true") return true;
  return process.env.NODE_ENV === "development";
}
