import { getCharacterEngine } from "../character/engine";
import { buildDataCoverageReport } from "../trends/coverage";
import { buildFileNoticed } from "../trends/file-noticed";
import { buildPageEvidence } from "../ui/page-evidence";
import type { LifeEntry, PlayerProfile } from "../db/types";
import type { FileNoticedItem } from "../trends/file-noticed";
import type { PageEvidence } from "../ui/page-evidence";

export interface LifePageData {
  profile: PlayerProfile;
  entries: LifeEntry[];
  syncing: boolean;
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

    let fileNoticed: FileNoticedItem[] = [];
    let pageEvidence: PageEvidence = { bullets: [], confidence: "low" };

    const apiKey = process.env.MY_TORN_API_KEY;
    if (apiKey) {
      const coverage = await buildDataCoverageReport(profile.id, apiKey);
      fileNoticed = buildFileNoticed({
        trendFacts: coverage.trend_facts,
        interpretationChanges: profile.interpretation_state?.what_changed,
        facts: profile.character_facts,
        recentDeltas7d: coverage.recent_deltas_7d,
        recentDeltasMonth: coverage.recent_deltas_month,
      });
      pageEvidence = buildPageEvidence(
        coverage,
        profile,
        profile.interpretation_state,
        profile.character_facts,
      );
    }

    return { profile, entries, syncing: false, fileNoticed, pageEvidence };
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
