import { getCharacterEngine } from "../character/engine";
import { buildDataCoverageReport } from "../trends/coverage";
import { buildBiographyTimeline } from "../biography/timeline";
import {
  buildFileNoticedFromLifeEngine,
  buildFileNoticedFromTimeline,
} from "../biography/noticed";
import { buildEvidenceFromTimeline } from "../biography/evidence";
import type { LifeEntry, PlayerProfile } from "../db/types";
import type { FileNoticedItem } from "../trends/file-noticed";
import type { PageEvidence } from "../ui/page-evidence";
import type { BiographyTimeline } from "../biography/types";
import type { LifeEngineSnapshot } from "../life-engine";

export interface LifePageData {
  profile: PlayerProfile;
  entries: LifeEntry[];
  syncing: boolean;
  timeline: BiographyTimeline;
  lifeEngine: LifeEngineSnapshot | null;
  fileNoticed: FileNoticedItem[];
  pageEvidence: PageEvidence;
}

export class LifeService {
  async getPageData(): Promise<LifePageData> {
    const engine = getCharacterEngine();
    const profile = await engine.getProfile();
    const entries = profile.character_locked
      ? await engine.getEntries()
      : [];

    let lifeEngine: LifeEngineSnapshot | null = null;
    try {
      lifeEngine = await engine.getLifeEngineSnapshot();
    } catch {
      lifeEngine = null;
    }

    let timeline: BiographyTimeline = {
      windows: [],
      hasEnoughForPatterns: false,
      totalBeats: 0,
    };
    let fileNoticed: FileNoticedItem[] = [];
    let pageEvidence: PageEvidence = { bullets: [], confidence: "low" };

    const apiKey = process.env.MY_TORN_API_KEY;
    if (apiKey) {
      const coverage = await buildDataCoverageReport(profile.id, apiKey);

      timeline = buildBiographyTimeline({
        deltas24h: coverage.recent_deltas_24h,
        deltas7d: coverage.recent_deltas_7d,
        deltas30d: coverage.recent_deltas_month,
        lifeEngine,
        syncDeltaCount: coverage.sync_delta_count,
      });

      const fromLife = buildFileNoticedFromLifeEngine(lifeEngine);
      const fromBiography = buildFileNoticedFromTimeline(timeline);

      fileNoticed =
        fromLife.length > 0
          ? fromLife
          : fromBiography;

      const conf =
        coverage.overall_confidence === "unavailable"
          ? "low"
          : coverage.overall_confidence;

      pageEvidence = buildEvidenceFromTimeline(timeline, conf);
    }

    return { profile, entries, syncing: false, timeline, lifeEngine, fileNoticed, pageEvidence };
  }

  async sync(): Promise<{
    profile: PlayerProfile;
    newEntries: LifeEntry[];
    generated: boolean;
  }> {
    const result = await getCharacterEngine().sync();
    return {
      profile: result.profile,
      newEntries: result.newEntries,
      generated: result.generated,
    };
  }

  async regenerateAssessment(
    correction?: { type: "quick" | "freeform"; value: string },
  ): Promise<PlayerProfile> {
    return getCharacterEngine().regenerateAssessment(correction);
  }

  async lockCharacter(): Promise<{
    profile: PlayerProfile;
    entries: LifeEntry[];
  }> {
    return getCharacterEngine().lockCharacter();
  }

  async applyEntryFeedback(
    entryId: string,
    feedbackType: string,
    note?: string,
  ) {
    return getCharacterEngine().applyEntryFeedback(entryId, feedbackType, note);
  }

  async pinCanon(entryId: string): Promise<PlayerProfile> {
    return getCharacterEngine().pinCanon(entryId);
  }

  async unpinCanon(entryId: string): Promise<PlayerProfile> {
    return getCharacterEngine().unpinCanon(entryId);
  }
}

export const lifeService = new LifeService();
