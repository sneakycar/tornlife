import { getCharacterEngine } from "../character/engine";
import type { LifeEntry, PlayerProfile } from "../db/types";

export interface LifePageData {
  profile: PlayerProfile;
  entries: LifeEntry[];
  syncing: boolean;
}

export class LifeService {
  async getPageData(): Promise<LifePageData> {
    const engine = getCharacterEngine();
    const profile = await engine.getProfile();
    const entries = profile.character_locked
      ? await engine.getEntries()
      : [];

    return { profile, entries, syncing: false };
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
