import { createServiceClient } from "../db/client";
import type { ContentType } from "./constants";
import { eventFamilyChain } from "./events";
import {
  filterEligibleSeeds,
  rankCandidates,
  weightedPick,
} from "./score";
import type {
  ContentSeed,
  SelectedContentRow,
  SelectionContext,
  SelectionResult,
} from "./types";

function mapSeed(row: Record<string, unknown>): ContentSeed {
  return {
    id: row.id as string,
    text: row.text as string,
    content_type: row.content_type as ContentSeed["content_type"],
    event_family: row.event_family as string,
    archetype_tags: (row.archetype_tags as string[]) ?? [],
    state_tags: (row.state_tags as string[]) ?? [],
    required_tags: (row.required_tags as string[]) ?? [],
    blocked_tags: (row.blocked_tags as string[]) ?? [],
    canon_required_tags: (row.canon_required_tags as string[]) ?? [],
    canon_blocked_tags: (row.canon_blocked_tags as string[]) ?? [],
    tone_tags: (row.tone_tags as string[]) ?? [],
    meter_min: (row.meter_min as ContentSeed["meter_min"]) ?? {},
    meter_max: (row.meter_max as ContentSeed["meter_max"]) ?? {},
    weight: (row.weight as number) ?? 100,
    rarity: (row.rarity as string) ?? "common",
    repeat_cooldown_days: (row.repeat_cooldown_days as number) ?? 30,
    global_cooldown_days: (row.global_cooldown_days as number) ?? 0,
    quality_score: (row.quality_score as number) ?? 50,
    approved: (row.approved as boolean) ?? false,
    active: (row.active as boolean) ?? true,
  };
}

export class SelectionEngine {
  private get db() {
    return createServiceClient();
  }

  async fetchCandidates(
    contentType: ContentType,
    eventFamilies: string[],
  ): Promise<ContentSeed[]> {
    const { data, error } = await this.db
      .from("content_seeds")
      .select("*")
      .eq("approved", true)
      .eq("active", true)
      .eq("content_type", contentType)
      .in("event_family", eventFamilies)
      .limit(300);

    if (error) throw new Error(`Seed query failed: ${error.message}`);
    return (data ?? []).map((row) => mapSeed(row));
  }

  async getPlayerHistory(playerId: string, limit = 500): Promise<SelectedContentRow[]> {
    const { data, error } = await this.db
      .from("selected_content_history")
      .select("*")
      .eq("player_profile_id", playerId)
      .order("selected_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data ?? []) as SelectedContentRow[];
  }

  async selectOne(
    contentType: ContentType,
    ctx: SelectionContext,
    playerId: string,
  ): Promise<SelectionResult | null> {
    const history = await this.getPlayerHistory(playerId);
    const families = eventFamilyChain(ctx.eventFamily);

    for (let relax = 0; relax < 3; relax++) {
      const relaxCanon = relax >= 1;
      const familySlice = relax === 0 ? families : families.slice(relax);
      const seeds = await this.fetchCandidates(contentType, familySlice);
      const eligible = filterEligibleSeeds(seeds, ctx, history, { relaxCanon });
      if (!eligible.length) continue;

      const ranked = rankCandidates(eligible, ctx, history);
      const picked = weightedPick(ranked);
      if (!picked) continue;

      return {
        seed: picked.seed,
        displayText: picked.seed.text,
        score: picked.score,
      };
    }

    return null;
  }

  async selectMany(
    contentType: ContentType,
    ctx: SelectionContext,
    playerId: string,
    count: number,
    excludeIds: Set<string> = new Set(),
  ): Promise<SelectionResult[]> {
    const results: SelectionResult[] = [];
    const used = new Set(excludeIds);
    const localCtx = { ...ctx };

    for (let i = 0; i < count; i++) {
      const pick = await this.selectOneExcluding(contentType, localCtx, playerId, used);
      if (!pick) break;
      results.push(pick);
      used.add(pick.seed.id);
    }
    return results;
  }

  private async selectOneExcluding(
    contentType: ContentType,
    ctx: SelectionContext,
    playerId: string,
    excludeIds: Set<string>,
  ): Promise<SelectionResult | null> {
    const history = await this.getPlayerHistory(playerId);
    const families = eventFamilyChain(ctx.eventFamily);

    for (let relax = 0; relax < 3; relax++) {
      const relaxCanon = relax >= 1;
      const familySlice = relax === 0 ? families : families.slice(relax);
      const seeds = await this.fetchCandidates(contentType, familySlice);
      const eligible = filterEligibleSeeds(seeds, ctx, history, { relaxCanon }).filter(
        (s) => !excludeIds.has(s.id),
      );
      if (!eligible.length) continue;

      const ranked = rankCandidates(eligible, ctx, history);
      const picked = weightedPick(ranked);
      if (!picked) continue;

      return {
        seed: picked.seed,
        displayText: picked.seed.text,
        score: picked.score,
      };
    }
    return null;
  }

  async saveSelection(
    playerId: string,
    result: SelectionResult,
    contentType: ContentType,
    eventFamily: string,
    context: Record<string, unknown>,
  ): Promise<SelectedContentRow> {
    const { data, error } = await this.db
      .from("selected_content_history")
      .insert({
        player_profile_id: playerId,
        content_seed_id: result.seed.id,
        content_type: contentType,
        event_family: eventFamily,
        selection_context: context,
        display_text: result.displayText,
      })
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to save selection");
    return data as SelectedContentRow;
  }
}

let engine: SelectionEngine | null = null;

export function getSelectionEngine(): SelectionEngine {
  if (!engine) engine = new SelectionEngine();
  return engine;
}
