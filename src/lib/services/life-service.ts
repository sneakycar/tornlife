import { getCharacterEngine } from "../character/engine";
import { buildDataCoverageReport } from "../trends/coverage";
import { buildFileNoticed } from "../trends/file-noticed";
import { fetchCachedEvents } from "../biography/data";
import { buildBiographyTimeline } from "../biography/timeline";
import { buildFileNoticedFromTimeline } from "../biography/noticed";
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
      const events = await fetchCachedEvents(profile.id);

      timeline = buildBiographyTimeline({
        deltas24h: coverage.recent_deltas_24h,
        deltas7d: coverage.recent_deltas_7d,
        deltas30d: coverage.recent_deltas_month,
        events,
        facts: profile.character_facts,
        syncDeltaCount: coverage.sync_delta_count,
      });

      const fromBiography = buildFileNoticedFromTimeline(timeline);
      const fromTrends = buildFileNoticed({
        trendFacts: coverage.trend_facts,
        interpretationChanges: profile.interpretation_state?.what_changed,
        facts: profile.character_facts,
        recentDeltas7d: coverage.recent_deltas_7d,
        recentDeltasMonth: coverage.recent_deltas_month,
      });

      fileNoticed =
        fromBiography.length > 0
          ? fromBiography
          : fromTrends;

      const conf =
        coverage.overall_confidence === "unavailable"
          ? "low"
          : coverage.overall_confidence;

      pageEvidence = buildEvidenceFromTimeline(timeline, conf);
      if (pageEvidence.bullets.length <= 1 && fromTrends.length > 0) {
        pageEvidence = {
          bullets: fromTrends.flatMap((f) => f.evidence).slice(0, 10),
          confidence: conf,
        };
      }
    }

    let lifeEngine: LifeEngineSnapshot | null = null;
    try {
      lifeEngine = await engine.getLifeEngineSnapshot();
    } catch {
      lifeEngine = null;
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
