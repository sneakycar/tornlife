import { createServiceClient } from "../db/client";
import type {
  AssessmentData,
  CalibrationNote,
  CharacterState,
  EntryType,
  FeedbackStatus,
  GenerationTrigger,
  LifeEntry,
  LoreMeters,
  PlayerProfile,
  TornSnapshot,
} from "../db/types";
import {
  DEFAULT_CHARACTER_STATE,
  DEFAULT_LORE_METERS,
} from "../db/types";
import { fetchTornUser } from "../torn/client";
import { normalizeTornSnapshot } from "../snapshot/normalize";
import { compareSnapshots } from "../snapshot/compare";
import {
  generateAssessment,
  generateNarrative,
  generateRewrite,
} from "../narrative/engine";
import {
  addCanonFacts,
  applyToneConstraint,
  assessmentToData,
  driftLoreMeters,
  mergeCharacterState,
  parseAssessmentData,
  parseCalibrationNotes,
  parseCharacterState,
  parseLoreMeters,
  removeCanonFromEntry,
} from "./types";

const AMBIENT_INTERVAL_HOURS = 8;

export interface SyncResult {
  profile: PlayerProfile;
  newEntries: LifeEntry[];
  generated: boolean;
  trigger: GenerationTrigger | null;
}

export class CharacterEngine {
  private get db() {
    return createServiceClient();
  }

  async getOrCreatePlayer(): Promise<PlayerProfile> {
    const { data: existing } = await this.db
      .from("player_profiles")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (existing) return this.mapProfile(existing);

    const apiKey = process.env.MY_TORN_API_KEY;
    if (!apiKey) throw new Error("MY_TORN_API_KEY is not configured");

    const tornData = await fetchTornUser(apiKey);
    const normalized = normalizeTornSnapshot(tornData);

    const { data: created, error } = await this.db
      .from("player_profiles")
      .insert({
        torn_user_id: normalized.tornUserId,
        username: normalized.username,
        age: normalized.age,
        archetype: "THE UNKNOWN",
        lore_meters: DEFAULT_LORE_METERS,
        character_state: DEFAULT_CHARACTER_STATE,
        initialized: false,
        character_locked: false,
        calibration_notes: [],
        assessment_version: 1,
      })
      .select("*")
      .single();

    if (error || !created) {
      throw new Error(`Failed to create player profile: ${error?.message}`);
    }

    return this.mapProfile(created);
  }

  async sync(): Promise<SyncResult> {
    const apiKey = process.env.MY_TORN_API_KEY;
    if (!apiKey) throw new Error("MY_TORN_API_KEY is not configured");

    let player = await this.getOrCreatePlayer();
    const tornData = await fetchTornUser(apiKey);
    const normalized = normalizeTornSnapshot(tornData);

    const previousSnapshot = await this.getLatestSnapshot(player.id);
    const changes = compareSnapshots(
      previousSnapshot?.normalized_summary ?? null,
      normalized,
    );

    await this.db.from("torn_snapshots").insert({
      player_id: player.id,
      raw_data: tornData as Record<string, unknown>,
      normalized_summary: normalized,
    });

    await this.db
      .from("player_profiles")
      .update({
        username: normalized.username,
        age: normalized.age,
        torn_user_id: normalized.tornUserId,
        last_sync_at: new Date().toISOString(),
      })
      .eq("id", player.id);

    player = await this.getPlayerById(player.id);

    if (!player.assessment_data) {
      await this.generateAndSaveAssessment(player, normalized);
      player = await this.getPlayerById(player.id);
      return {
        profile: player,
        newEntries: [],
        generated: true,
        trigger: "assessment",
      };
    }

    if (!player.character_locked) {
      return { profile: player, newEntries: [], generated: false, trigger: null };
    }

    const recentEntries = await this.getRecentEntryTexts(player.id, 5);
    const newEntries: LifeEntry[] = [];

    if (changes.hasMeaningfulChanges) {
      const entry = await this.runEntryGeneration(player, "snapshot_change", {
        changes,
        recentEntries,
        sourceSummary: { changes: changes.narrativeHints },
      });
      if (entry) newEntries.push(entry);
    } else if (this.shouldGenerateAmbient(player)) {
      const entry = await this.runEntryGeneration(player, "ambient", {
        recentEntries,
        sourceSummary: { type: "ambient" },
      });
      if (entry) newEntries.push(entry);
    }

    const updated = await this.getPlayerById(player.id);
    return {
      profile: updated,
      newEntries,
      generated: newEntries.length > 0,
      trigger: newEntries.length > 0
        ? changes.hasMeaningfulChanges ? "snapshot_change" : "ambient"
        : null,
    };
  }

  async regenerateAssessment(
    correction?: { type: "quick" | "freeform"; value: string },
  ): Promise<PlayerProfile> {
    const player = await this.getOrCreatePlayer();
    const snapshot = await this.getLatestSnapshot(player.id);
    if (!snapshot) throw new Error("No Torn snapshot available");

    const notes: CalibrationNote[] = [...player.calibration_notes];
    if (correction) {
      notes.push({
        type: correction.type,
        value: correction.value,
        created_at: new Date().toISOString(),
      });
    }

    const { output, tokensUsed } = await generateAssessment({
      summary: snapshot.normalized_summary,
      username: player.username,
      calibrationNotes: notes,
    });

    const assessmentData = assessmentToData(output);
    const characterState = mergeCharacterState(
      output.character_state,
      { calibration_notes: notes.map((n) => n.value) },
    );

    await this.db
      .from("player_profiles")
      .update({
        archetype: output.archetype,
        age: output.age ?? player.age,
        lore_meters: output.meters,
        assessment_data: assessmentData,
        character_state: characterState,
        calibration_notes: notes,
        assessment_version: player.assessment_version + 1,
        initialized: true,
      })
      .eq("id", player.id);

    await this.db.from("generation_runs").insert({
      player_id: player.id,
      trigger_type: "assessment",
      input_summary: { correction: correction?.value ?? "regenerate" },
      output_summary: { archetype: output.archetype },
      tokens_used: tokensUsed,
      success: true,
    });

    return this.getPlayerById(player.id);
  }

  async lockCharacter(): Promise<{ profile: PlayerProfile; entries: LifeEntry[] }> {
    const player = await this.getOrCreatePlayer();
    if (!player.assessment_data) {
      throw new Error("Assessment must exist before locking");
    }
    if (player.character_locked) {
      const entries = await this.getEntries();
      return { profile: player, entries };
    }

    const snapshot = await this.getLatestSnapshot(player.id);
    if (!snapshot) throw new Error("No snapshot available");

    const characterState = player.character_state;
    characterState.archetype = player.archetype;

    await this.db
      .from("player_profiles")
      .update({
        character_locked: true,
        character_state: characterState,
        initialized: true,
      })
      .eq("id", player.id);

    const lockedPlayer = await this.getPlayerById(player.id);

    const { output, tokensUsed } = await generateNarrative({
      mode: "initial_batch",
      username: lockedPlayer.username,
      archetype: lockedPlayer.archetype,
      loreMeters: lockedPlayer.lore_meters,
      characterState: lockedPlayer.character_state,
      summary: snapshot.normalized_summary,
      recentEntries: [],
    });

    const entries: LifeEntry[] = [];
    for (const item of output.entries) {
      const { data: entry, error } = await this.db
        .from("life_entries")
        .insert({
          player_id: lockedPlayer.id,
          content: item.text,
          entry_type: "initial",
          source_type: item.source_type,
          source_summary: snapshot.normalized_summary as unknown as Record<string, unknown>,
          tone_tags: item.tone_tags,
        })
        .select("*")
        .single();

      if (error || !entry) throw new Error(error?.message ?? "Failed to save entry");
      entries.push(this.mapEntry(entry));
    }

    const updatedState = mergeCharacterState(
      lockedPlayer.character_state,
      output.character_state_patch,
    );

    await this.db
      .from("player_profiles")
      .update({ character_state: updatedState })
      .eq("id", lockedPlayer.id);

    await this.db.from("generation_runs").insert({
      player_id: lockedPlayer.id,
      trigger_type: "lock",
      input_summary: { entryCount: output.entries.length },
      output_summary: { archetype: lockedPlayer.archetype },
      tokens_used: tokensUsed,
      success: true,
    });

    return {
      profile: await this.getPlayerById(lockedPlayer.id),
      entries,
    };
  }

  async applyEntryFeedback(
    entryId: string,
    feedbackType: string,
    note?: string,
  ): Promise<{ entry: LifeEntry; replacement?: LifeEntry; profile: PlayerProfile }> {
    const player = await this.getOrCreatePlayer();
    const { data: row, error } = await this.db
      .from("life_entries")
      .select("*")
      .eq("id", entryId)
      .eq("player_id", player.id)
      .single();

    if (error || !row) throw new Error("Entry not found");
    const entry = this.mapEntry(row);

    await this.db.from("entry_feedback").insert({
      life_entry_id: entryId,
      player_profile_id: player.id,
      feedback_type: feedbackType,
      feedback_note: note ?? null,
    });

    let state = player.character_state;
    let replacement: LifeEntry | undefined;
    let newStatus: FeedbackStatus = entry.feedback_status;

    const needsRewrite = !["Keep", "More like this", "Less like this"].includes(feedbackType);

    if (feedbackType === "Keep") {
      newStatus = "kept";
    } else if (feedbackType === "More like this") {
      newStatus = "positive_example";
      state = mergeCharacterState(state, {
        preferred_patterns: [...entry.tone_tags, ...state.preferred_patterns],
      });
    } else if (feedbackType === "Less like this") {
      newStatus = "negative_example";
      state = mergeCharacterState(state, {
        avoid_patterns: [...entry.tone_tags, ...state.avoid_patterns],
      });
    } else if (feedbackType === "Never reference this again") {
      newStatus = "rejected";
      const themes = entry.tone_tags.length ? entry.tone_tags : [entry.content.slice(0, 80)];
      state = mergeCharacterState(state, { forbidden_references: themes });
      // fall through to rewrite below
    } else if (feedbackType === "Doesn't sound like him") {
      if (note) {
        state = mergeCharacterState(state, { identity_notes: [note] });
      }
    } else if (needsRewrite) {
      state = mergeCharacterState(state, {
        tone_constraints: applyToneConstraint(state.tone_constraints, feedbackType),
      });
    }

    const shouldRewrite =
      needsRewrite || feedbackType === "Never reference this again";

    if (shouldRewrite) {
      const { output, tokensUsed } = await generateRewrite({
        username: player.username,
        originalEntry: entry.content,
        sourceSummary: entry.source_summary,
        feedbackReason: feedbackType,
        feedbackNote: note ?? null,
        characterState: state,
      });

      const { data: newRow, error: insertErr } = await this.db
        .from("life_entries")
        .insert({
          player_id: player.id,
          content: output.replacement_text,
          entry_type: entry.entry_type,
          source_type: entry.source_type,
          source_summary: entry.source_summary,
          tone_tags: output.tone_tags,
          feedback_status: "none",
        })
        .select("*")
        .single();

      if (insertErr || !newRow) throw new Error(insertErr?.message ?? "Rewrite failed");

      replacement = this.mapEntry(newRow);
      newStatus = "superseded";

      await this.db
        .from("life_entries")
        .update({
          feedback_status: newStatus,
          superseded_by: replacement.id,
          feedback_notes: [{ type: feedbackType, note }],
        })
        .eq("id", entryId);

      state = mergeCharacterState(state, output.character_state_patch);

      await this.db.from("generation_runs").insert({
        player_id: player.id,
        trigger_type: "rewrite",
        input_summary: { entryId, feedbackType },
        output_summary: { replacementId: replacement.id },
        tokens_used: tokensUsed,
        success: true,
      });
    } else {
      await this.db
        .from("life_entries")
        .update({
          feedback_status: newStatus,
          feedback_notes: [{ type: feedbackType, note }],
        })
        .eq("id", entryId);
    }

    await this.db
      .from("player_profiles")
      .update({ character_state: state })
      .eq("id", player.id);

    const { data: latestFeedback } = await this.db
      .from("entry_feedback")
      .select("id")
      .eq("life_entry_id", entryId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestFeedback) {
      await this.db
        .from("entry_feedback")
        .update({
          applied: true,
          resulting_entry_id: replacement?.id ?? null,
          state_patch: state as unknown as Record<string, unknown>,
        })
        .eq("id", latestFeedback.id);
    }

    const profile = await this.getPlayerById(player.id);
    const updatedEntry = replacement ?? (await this.getEntryById(entryId));
    return { entry: updatedEntry, replacement, profile };
  }

  async pinCanon(entryId: string): Promise<PlayerProfile> {
    const player = await this.getOrCreatePlayer();
    const entry = await this.getEntryById(entryId);

    await this.db
      .from("life_entries")
      .update({ is_canon: true })
      .eq("id", entryId);

    const facts = entry.tone_tags.length
      ? entry.tone_tags
      : [entry.content.slice(0, 120)];

    const state = addCanonFacts(player.character_state, facts);
    await this.db
      .from("player_profiles")
      .update({ character_state: state })
      .eq("id", player.id);

    return this.getPlayerById(player.id);
  }

  async unpinCanon(entryId: string): Promise<PlayerProfile> {
    const player = await this.getOrCreatePlayer();
    const entry = await this.getEntryById(entryId);

    await this.db
      .from("life_entries")
      .update({ is_canon: false })
      .eq("id", entryId);

    const facts = entry.tone_tags.length
      ? entry.tone_tags
      : [entry.content.slice(0, 120)];

    const state = removeCanonFromEntry(player.character_state, facts);
    await this.db
      .from("player_profiles")
      .update({ character_state: state })
      .eq("id", player.id);

    return this.getPlayerById(player.id);
  }

  async getProfile(): Promise<PlayerProfile> {
    return this.getOrCreatePlayer();
  }

  async getEntries(limit = 50): Promise<LifeEntry[]> {
    const player = await this.getOrCreatePlayer();
    const { data, error } = await this.db
      .from("life_entries")
      .select("*")
      .eq("player_id", player.id)
      .neq("feedback_status", "superseded")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => this.mapEntry(row));
  }

  private async generateAndSaveAssessment(
    player: PlayerProfile,
    summary: TornSnapshot["normalized_summary"],
  ): Promise<void> {
    const { output, tokensUsed } = await generateAssessment({
      summary,
      username: player.username,
      calibrationNotes: player.calibration_notes,
    });

    await this.db
      .from("player_profiles")
      .update({
        archetype: output.archetype,
        age: output.age ?? player.age,
        lore_meters: output.meters,
        assessment_data: assessmentToData(output),
        character_state: output.character_state,
        initialized: true,
      })
      .eq("id", player.id);

    await this.db.from("generation_runs").insert({
      player_id: player.id,
      trigger_type: "assessment",
      input_summary: { firstRun: true },
      output_summary: { archetype: output.archetype },
      tokens_used: tokensUsed,
      success: true,
    });
  }

  private async runEntryGeneration(
    player: PlayerProfile,
    trigger: "snapshot_change" | "ambient",
    context: {
      changes?: ReturnType<typeof compareSnapshots>;
      recentEntries: string[];
      sourceSummary: Record<string, unknown>;
    },
  ): Promise<LifeEntry | null> {
    const mode = trigger === "ambient" ? "ambient" : "reactive";
    const entryType: EntryType = trigger === "ambient" ? "ambient" : "reactive";

    try {
      const result = await generateNarrative({
        mode,
        username: player.username,
        archetype: player.archetype,
        loreMeters: player.lore_meters,
        characterState: player.character_state,
        changes: context.changes,
        recentEntries: context.recentEntries,
      });

      const item = result.output.entries[0];
      const updatedState = mergeCharacterState(
        player.character_state,
        result.output.character_state_patch,
      );

      const { data: entry, error } = await this.db
        .from("life_entries")
        .insert({
          player_id: player.id,
          content: item.text,
          entry_type: entryType,
          source_type: item.source_type,
          source_summary: context.sourceSummary,
          tone_tags: item.tone_tags,
        })
        .select("*")
        .single();

      if (error || !entry) throw new Error(error?.message ?? "Failed to save entry");

      await this.db
        .from("player_profiles")
        .update({
          character_state: updatedState,
          ...(trigger === "ambient"
            ? { last_ambient_at: new Date().toISOString() }
            : {}),
        })
        .eq("id", player.id);

      await this.db.from("generation_runs").insert({
        player_id: player.id,
        trigger_type: trigger,
        input_summary: { mode },
        output_summary: { entryType },
        tokens_used: result.tokensUsed,
        success: true,
      });

      return this.mapEntry(entry);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await this.db.from("generation_runs").insert({
        player_id: player.id,
        trigger_type: trigger,
        input_summary: { mode },
        output_summary: {},
        success: false,
        error_message: message,
      });
      throw err;
    }
  }

  private shouldGenerateAmbient(player: PlayerProfile): boolean {
    if (!player.last_ambient_at) return true;
    const hoursSince =
      (Date.now() - new Date(player.last_ambient_at).getTime()) / (1000 * 60 * 60);
    return hoursSince >= AMBIENT_INTERVAL_HOURS;
  }

  private async getLatestSnapshot(playerId: string): Promise<TornSnapshot | null> {
    const { data } = await this.db
      .from("torn_snapshots")
      .select("*")
      .eq("player_id", playerId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!data?.length) return null;
    const row = data[0];
    return {
      id: row.id,
      player_id: row.player_id,
      raw_data: row.raw_data as Record<string, unknown>,
      normalized_summary: row.normalized_summary as TornSnapshot["normalized_summary"],
      created_at: row.created_at,
    };
  }

  private async getRecentEntryTexts(playerId: string, limit: number): Promise<string[]> {
    const { data } = await this.db
      .from("life_entries")
      .select("content")
      .eq("player_id", playerId)
      .neq("feedback_status", "superseded")
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((row) => row.content);
  }

  private async getEntryById(id: string): Promise<LifeEntry> {
    const { data, error } = await this.db
      .from("life_entries")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) throw new Error("Entry not found");
    return this.mapEntry(data);
  }

  private async getPlayerById(id: string): Promise<PlayerProfile> {
    const { data, error } = await this.db
      .from("player_profiles")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) throw new Error("Player not found");
    return this.mapProfile(data);
  }

  private mapEntry(row: Record<string, unknown>): LifeEntry {
    return {
      id: row.id as string,
      player_id: row.player_id as string,
      content: row.content as string,
      entry_type: row.entry_type as EntryType,
      feedback_status: (row.feedback_status as FeedbackStatus) ?? "none",
      superseded_by: (row.superseded_by as string | null) ?? null,
      feedback_notes: (row.feedback_notes as unknown[]) ?? [],
      is_canon: (row.is_canon as boolean) ?? false,
      source_type: (row.source_type as string | null) ?? null,
      source_summary: (row.source_summary as Record<string, unknown> | null) ?? null,
      tone_tags: (row.tone_tags as string[]) ?? [],
      created_at: row.created_at as string,
    };
  }

  private mapProfile(row: Record<string, unknown>): PlayerProfile {
    return {
      id: row.id as string,
      torn_user_id: row.torn_user_id as number | null,
      username: row.username as string,
      civilian_name: (row.civilian_name as string | null) ?? null,
      age: row.age as number | null,
      archetype: row.archetype as string,
      lore_meters: parseLoreMeters(row.lore_meters),
      character_state: parseCharacterState(row.character_state),
      assessment_data: parseAssessmentData(row.assessment_data),
      character_locked: (row.character_locked as boolean) ?? false,
      calibration_notes: parseCalibrationNotes(row.calibration_notes),
      assessment_version: (row.assessment_version as number) ?? 1,
      initialized: row.initialized as boolean,
      last_sync_at: row.last_sync_at as string | null,
      last_ambient_at: row.last_ambient_at as string | null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  }
}

let engine: CharacterEngine | null = null;

export function getCharacterEngine(): CharacterEngine {
  if (!engine) engine = new CharacterEngine();
  return engine;
}
