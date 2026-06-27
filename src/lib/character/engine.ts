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
import { buildFactChanges } from "../snapshot/fact-changes";
import type { CharacterFacts } from "../db/types";
import {
  addCanonFacts,
  applyToneConstraint,
  mergeCharacterState,
  parseAssessmentData,
  parseCalibrationNotes,
  parseCharacterState,
  parseLoreMeters,
  removeCanonFromEntry,
} from "./types";
import { getSelectionEngine } from "../selection/engine";
import { classifyPlayerTags, mergeTagSets } from "../selection/tags";
import { detectPrimaryEvent } from "../selection/events";
import { computeLoreMeters, driftMeters } from "../selection/meters";
import { computeArchetypes, driftArchetypeScores } from "../selection/archetypes";
import {
  buildAssessmentData,
  buildInterpretationState,
} from "../selection/interpretation";
import {
  applyCalibrationTags,
  applyFeedbackTags,
  extractCanonTags,
} from "../selection/calibration";
import {
  appendFileNote,
  markNoteDisputed,
  parseFileNotes,
  pickNewObservation,
  confirmNote,
} from "./file-notes";
import { recordTrendData } from "../trends/record";
import { applyArchetypeMeta } from "../archetypes/reclassification";
import type { SelectionContext, SelectedContentRow } from "../selection/types";
import type { ContentType } from "../selection/constants";

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

  private get selection() {
    return getSelectionEngine();
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

    if (
      player.file_notes.length === 0 &&
      player.assessment_data?.assessment_text
    ) {
      const fileNotes = appendFileNote([], player.assessment_data.assessment_text);
      await this.db
        .from("player_profiles")
        .update({ file_notes: fileNotes })
        .eq("id", player.id);
      player = await this.getPlayerById(player.id);
    }

    const tornData = await fetchTornUser(apiKey);
    const normalized = normalizeTornSnapshot(tornData);

    const previousSnapshot = await this.getLatestSnapshot(player.id);
    const changes = compareSnapshots(
      previousSnapshot?.normalized_summary ?? null,
      normalized,
    );
    const factChanges = buildFactChanges(
      previousSnapshot?.normalized_summary ?? null,
      normalized,
    );

    const playerTags = classifyPlayerTags(normalized, changes, factChanges);
    const meters = driftMeters(player.lore_meters, computeLoreMeters(normalized));
    const archetypes = computeArchetypes(normalized);
    const archetypeScores = driftArchetypeScores(
      player.archetype_scores ?? {},
      archetypes.scores,
    );

    const { data: snapRow, error: snapErr } = await this.db
      .from("torn_snapshots")
      .insert({
        player_id: player.id,
        raw_data: tornData as Record<string, unknown>,
        normalized_summary: normalized,
      })
      .select("id")
      .single();

    if (snapErr || !snapRow) {
      throw new Error(snapErr?.message ?? "Failed to store snapshot");
    }

    await recordTrendData({
      playerId: player.id,
      snapshotId: snapRow.id,
      previousSnapshotId: previousSnapshot?.id ?? null,
      tornData,
      apiKey,
    });

    const archetypeState = applyArchetypeMeta(
      player.character_state,
      player.archetype,
      archetypes.primary,
      archetypeScores,
    );

    await this.db
      .from("player_profiles")
      .update({
        username: normalized.username,
        age: normalized.age,
        torn_user_id: normalized.tornUserId,
        character_facts: normalized.characterFacts,
        lore_meters: meters,
        archetype: archetypes.primary,
        secondary_archetypes: archetypes.secondary,
        emerging_archetypes: archetypes.emerging,
        archetype_scores: archetypeScores,
        player_tags: mergeTagSets(playerTags, player.player_tags),
        character_state: archetypeState,
        last_sync_at: new Date().toISOString(),
      })
      .eq("id", player.id);

    player = await this.getPlayerById(player.id);

    if (!player.assessment_data) {
      await this.buildAndSaveAssessment(player, normalized, playerTags, meters);
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

    if (factChanges.length > 0 || !player.interpretation_state) {
      await this.updateInterpretationFromSelection(
        player,
        normalized,
        factChanges,
        playerTags,
        meters,
        changes,
      );
      player = await this.getPlayerById(player.id);
    }

    const newEntries: LifeEntry[] = [];

    if (changes.hasMeaningfulChanges) {
      const entry = await this.selectLogEntry(
        player,
        "what_changed",
        detectPrimaryEvent(changes, factChanges, "sync"),
        playerTags,
        meters,
        "reactive",
        { changes: changes.narrativeHints },
      );
      if (entry) newEntries.push(entry);
    } else if (this.shouldGenerateAmbient(player)) {
      const entry = await this.selectLogEntry(
        player,
        "ambient_life",
        "quiet_day",
        playerTags,
        meters,
        "ambient",
        { type: "ambient" },
      );
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
    let blocked = [...player.blocked_tags];
    let preferred = [...player.preferred_tags];

    if (correction) {
      notes.push({
        type: correction.type,
        value: correction.value,
        created_at: new Date().toISOString(),
      });
      const tagUpdate = applyCalibrationTags(blocked, preferred, correction.value);
      blocked = tagUpdate.blocked;
      preferred = tagUpdate.preferred;
    }

    const summary = snapshot.normalized_summary;
    const playerTags = classifyPlayerTags(summary);
    const meters = computeLoreMeters(summary);
    const archetypes = computeArchetypes(summary);

    const ctx = this.buildContext(
      player,
      "assessment",
      mergeTagSets(playerTags, preferred),
      meters,
      blocked,
      preferred,
      archetypes.tags,
    );

    const mainLine = await this.selection.selectOne(
      "character_assessment_line",
      ctx,
      player.id,
    );
    const traits = await this.selection.selectMany(
      "status_line",
      { ...ctx, eventFamily: "assessment" },
      player.id,
      4,
    );
    const habits = await this.selection.selectMany(
      "status_line",
      { ...ctx, eventFamily: "assessment" },
      player.id,
      3,
      new Set(traits.map((t) => t.seed.id)),
    );
    const vices = await this.selection.selectMany(
      "status_line",
      { ...ctx, eventFamily: "vice_shift" },
      player.id,
      2,
    );
    const fears = await this.selection.selectMany(
      "status_line",
      { ...ctx, eventFamily: "quiet_day" },
      player.id,
      2,
    );

    const assessmentData = buildAssessmentData(
      mainLine,
      traits,
      habits,
      vices,
      fears,
      preferred,
    );

    const characterState = mergeCharacterState(player.character_state, {
      archetype: archetypes.primary,
      calibration_notes: notes.map((n) => n.value),
    });

    const interpretation = buildInterpretationState(
      { ...player, archetype: archetypes.primary, emerging_archetypes: archetypes.emerging },
      summary.characterFacts,
      [],
      {
        currentState: await this.selection.selectOne("current_state", ctx, player.id),
        assessmentLine: mainLine,
        explanations: await this.selection.selectMany(
          "explanation_line",
          ctx,
          player.id,
          5,
        ),
      },
      meters,
    );

    let fileNotes = parseFileNotes(player.file_notes);
    if (correction) {
      const disputeText =
        correction.type === "freeform"
          ? correction.value
          : `Not ${correction.value.toLowerCase()}.`;
      fileNotes = markNoteDisputed(fileNotes, disputeText);
    }
    const newObs = pickNewObservation(
      traits.map((t) => t.displayText),
      fileNotes,
    );
    if (newObs) {
      fileNotes = appendFileNote(fileNotes, newObs);
    }

    await this.db
      .from("player_profiles")
      .update({
        archetype: archetypes.primary,
        secondary_archetypes: archetypes.secondary,
        emerging_archetypes: archetypes.emerging,
        archetype_scores: archetypes.scores,
        lore_meters: meters,
        assessment_data: assessmentData,
        character_state: characterState,
        interpretation_state: interpretation,
        character_facts: summary.characterFacts,
        calibration_notes: notes,
        blocked_tags: blocked,
        preferred_tags: preferred,
        player_tags: mergeTagSets(playerTags, preferred),
        file_notes: fileNotes,
        assessment_version: player.assessment_version + 1,
        initialized: true,
      })
      .eq("id", player.id);

    await this.logSelectionRun(player.id, "assessment", {
      archetype: archetypes.primary,
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

    const characterState = mergeCharacterState(player.character_state, {
      archetype: player.archetype,
    });

    await this.db
      .from("player_profiles")
      .update({
        character_locked: true,
        character_state: characterState,
        initialized: true,
      })
      .eq("id", player.id);

    const lockedPlayer = await this.getPlayerById(player.id);
    const playerTags = classifyPlayerTags(snapshot.normalized_summary);
    const ctx = this.buildContext(
      lockedPlayer,
      "lock_batch",
      playerTags,
      lockedPlayer.lore_meters,
      lockedPlayer.blocked_tags,
      lockedPlayer.preferred_tags,
      mergeTagSets(lockedPlayer.player_tags, computeArchetypes(snapshot.normalized_summary).tags),
    );

    const picks = await this.selection.selectMany(
      "ambient_life",
      ctx,
      lockedPlayer.id,
      3,
    );
    const obsPicks = await this.selection.selectMany(
      "recent_observation",
      ctx,
      lockedPlayer.id,
      2,
      new Set(picks.map((p) => p.seed.id)),
    );

    const entries: LifeEntry[] = [];
    for (const pick of [...picks, ...obsPicks]) {
      const row = await this.selection.saveSelection(
        lockedPlayer.id,
        pick,
        pick.seed.content_type as ContentType,
        ctx.eventFamily,
        { trigger: "lock" },
      );
      entries.push(this.historyToEntry(row, "initial"));
    }

    await this.logSelectionRun(lockedPlayer.id, "lock", { entryCount: entries.length });

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
    const entry = await this.getHistoryEntry(entryId);

    await this.db.from("entry_feedback").insert({
      life_entry_id: entryId,
      player_profile_id: player.id,
      feedback_type: feedbackType,
      feedback_note: note ?? null,
    });

    let blocked = [...player.blocked_tags];
    let preferred = [...player.preferred_tags];
    let state = player.character_state;
    let newStatus: FeedbackStatus = entry.feedback_status as FeedbackStatus;

    const entryTags = entry.tone_tags.length
      ? entry.tone_tags
      : extractCanonTags(entry.content, []);

    if (feedbackType === "Keep") {
      newStatus = "kept";
    } else if (feedbackType === "More like this") {
      newStatus = "positive_example";
      const tags = applyFeedbackTags(blocked, preferred, feedbackType, entryTags);
      blocked = tags.blocked;
      preferred = tags.preferred;
      state = mergeCharacterState(state, {
        preferred_patterns: [...entryTags, ...state.preferred_patterns],
      });
    } else if (feedbackType === "Less like this") {
      newStatus = "negative_example";
      const tags = applyFeedbackTags(blocked, preferred, feedbackType, entryTags);
      blocked = tags.blocked;
      preferred = tags.preferred;
      state = mergeCharacterState(state, {
        avoid_patterns: [...entryTags, ...state.avoid_patterns],
      });
    } else if (feedbackType === "Never reference this again") {
      newStatus = "rejected";
      const tags = applyFeedbackTags(blocked, preferred, feedbackType, entryTags);
      blocked = tags.blocked;
      preferred = tags.preferred;
      state = mergeCharacterState(state, {
        forbidden_references: [...entryTags, ...state.forbidden_references],
      });
    } else if (feedbackType === "Doesn't sound like him") {
      if (note) {
        state = mergeCharacterState(state, { identity_notes: [note] });
      }
      newStatus = "negative_example";
    } else {
      newStatus = "negative_example";
      const tags = applyFeedbackTags(blocked, preferred, feedbackType, entryTags);
      blocked = tags.blocked;
      preferred = tags.preferred;
      state = mergeCharacterState(state, {
        tone_constraints: applyToneConstraint(state.tone_constraints, feedbackType),
      });
    }

    await this.db
      .from("selected_content_history")
      .update({ feedback_status: newStatus })
      .eq("id", entryId);

    await this.db
      .from("player_profiles")
      .update({
        character_state: state,
        blocked_tags: blocked,
        preferred_tags: preferred,
      })
      .eq("id", player.id);

    const profile = await this.getPlayerById(player.id);
    const updatedEntry = await this.getHistoryEntry(entryId);
    return { entry: updatedEntry, profile };
  }

  async pinCanon(entryId: string): Promise<PlayerProfile> {
    const player = await this.getOrCreatePlayer();
    const entry = await this.getHistoryEntry(entryId);

    await this.db
      .from("selected_content_history")
      .update({ was_pinned_canon: true })
      .eq("id", entryId);

    const canonTags = extractCanonTags(entry.content, entry.tone_tags);
    const facts = canonTags.length ? canonTags : [entry.content.slice(0, 120)];

    const state = addCanonFacts(player.character_state, facts);
    const mergedCanonTags = [...new Set([...player.canon_tags, ...canonTags])];

    let fileNotes = parseFileNotes(player.file_notes);
    const match = fileNotes.find(
      (n) => n.text.toLowerCase() === entry.content.trim().toLowerCase(),
    );
    if (match) {
      fileNotes = confirmNote(fileNotes, match.id);
    } else {
      fileNotes = appendFileNote(fileNotes, entry.content.slice(0, 200), "confirmed");
    }

    await this.db
      .from("player_profiles")
      .update({
        character_state: state,
        canon_tags: mergedCanonTags,
        file_notes: fileNotes,
      })
      .eq("id", player.id);

    return this.getPlayerById(player.id);
  }

  async unpinCanon(entryId: string): Promise<PlayerProfile> {
    const player = await this.getOrCreatePlayer();
    const entry = await this.getHistoryEntry(entryId);

    await this.db
      .from("selected_content_history")
      .update({ was_pinned_canon: false })
      .eq("id", entryId);

    const canonTags = extractCanonTags(entry.content, entry.tone_tags);
    const facts = canonTags.length ? canonTags : [entry.content.slice(0, 120)];

    const state = removeCanonFromEntry(player.character_state, facts);
    const removeSet = new Set(canonTags);
    const mergedCanonTags = player.canon_tags.filter((t) => !removeSet.has(t));

    await this.db
      .from("player_profiles")
      .update({
        character_state: state,
        canon_tags: mergedCanonTags,
      })
      .eq("id", player.id);

    return this.getPlayerById(player.id);
  }

  async getProfile(): Promise<PlayerProfile> {
    return this.getOrCreatePlayer();
  }

  async getEntries(limit = 50): Promise<LifeEntry[]> {
    const player = await this.getOrCreatePlayer();
    const { data, error } = await this.db
      .from("selected_content_history")
      .select("*")
      .eq("player_profile_id", player.id)
      .neq("feedback_status", "superseded")
      .order("selected_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data ?? []).map((row) =>
      this.historyToEntry(row as SelectedContentRow, "selected"),
    );
  }

  async getLatestNormalizedSummary(
    playerId: string,
  ): Promise<TornSnapshot["normalized_summary"] | null> {
    const snap = await this.getLatestSnapshot(playerId);
    return snap?.normalized_summary ?? null;
  }

  async getPreviousNormalizedSummary(
    playerId: string,
  ): Promise<TornSnapshot["normalized_summary"] | null> {
    const { data } = await this.db
      .from("torn_snapshots")
      .select("normalized_summary")
      .eq("player_id", playerId)
      .order("created_at", { ascending: false })
      .limit(2);

    if (!data || data.length < 2) return null;
    return data[1].normalized_summary as TornSnapshot["normalized_summary"];
  }

  async getLatestSnapshotMeta(
    playerId: string,
  ): Promise<{ created_at: string } | null> {
    const { data } = await this.db
      .from("torn_snapshots")
      .select("created_at")
      .eq("player_id", playerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ? { created_at: data.created_at as string } : null;
  }

  private async buildAndSaveAssessment(
    player: PlayerProfile,
    summary: TornSnapshot["normalized_summary"],
    playerTags: string[],
    meters: LoreMeters,
  ): Promise<void> {
    const archetypes = computeArchetypes(summary);
    const ctx = this.buildContext(
      player,
      "first_observation",
      mergeTagSets(playerTags, player.preferred_tags),
      meters,
      player.blocked_tags,
      player.preferred_tags,
      archetypes.tags,
    );

    const mainLine = await this.selection.selectOne(
      "character_assessment_line",
      ctx,
      player.id,
    );
    const traits = await this.selection.selectMany("status_line", ctx, player.id, 4);
    const habits = await this.selection.selectMany(
      "status_line",
      ctx,
      player.id,
      3,
      new Set(traits.map((t) => t.seed.id)),
    );
    const vices = await this.selection.selectMany(
      "status_line",
      { ...ctx, eventFamily: "vice_shift" },
      player.id,
      2,
    );
    const fears = await this.selection.selectMany(
      "status_line",
      { ...ctx, eventFamily: "quiet_day" },
      player.id,
      2,
    );

    const assessmentData = buildAssessmentData(
      mainLine,
      traits,
      habits,
      vices,
      fears,
      player.preferred_tags,
    );

    let fileNotes = parseFileNotes(player.file_notes);
    if (mainLine?.displayText && fileNotes.length === 0) {
      fileNotes = appendFileNote(fileNotes, mainLine.displayText);
    }

    const interpretation = buildInterpretationState(
      { ...player, archetype: archetypes.primary, emerging_archetypes: archetypes.emerging },
      summary.characterFacts,
      [],
      {
        currentState: await this.selection.selectOne("current_state", ctx, player.id),
        assessmentLine: mainLine,
        explanations: await this.selection.selectMany("explanation_line", ctx, player.id, 5),
      },
      meters,
    );

    await this.db
      .from("player_profiles")
      .update({
        archetype: archetypes.primary,
        secondary_archetypes: archetypes.secondary,
        emerging_archetypes: archetypes.emerging,
        archetype_scores: archetypes.scores,
        lore_meters: meters,
        assessment_data: assessmentData,
        character_state: mergeCharacterState(player.character_state, {
          archetype: archetypes.primary,
        }),
        interpretation_state: interpretation,
        character_facts: summary.characterFacts,
        player_tags: playerTags,
        file_notes: fileNotes,
        initialized: true,
      })
      .eq("id", player.id);

    await this.logSelectionRun(player.id, "assessment", {
      archetype: archetypes.primary,
      firstRun: true,
    });
  }

  private async updateInterpretationFromSelection(
    player: PlayerProfile,
    summary: TornSnapshot["normalized_summary"],
    factChanges: ReturnType<typeof buildFactChanges>,
    playerTags: string[],
    meters: LoreMeters,
    changes: ReturnType<typeof compareSnapshots>,
  ): Promise<void> {
    const eventFamily = detectPrimaryEvent(changes, factChanges, "sync");
    const ctx = this.buildContext(
      player,
      eventFamily,
      playerTags,
      meters,
      player.blocked_tags,
      player.preferred_tags,
      mergeTagSets(player.player_tags, computeArchetypes(summary).tags),
    );

    const whatChanged = await this.selection.selectMany(
      "what_changed",
      ctx,
      player.id,
      Math.min(factChanges.length, 3),
    );
    const observations = await this.selection.selectMany(
      "recent_observation",
      ctx,
      player.id,
      2,
    );
    const discoveries = await this.selection.selectMany(
      "new_discovery",
      ctx,
      player.id,
      2,
    );

    const interpretation = buildInterpretationState(
      player,
      summary.characterFacts,
      factChanges,
      {
        currentState: await this.selection.selectOne("current_state", ctx, player.id),
        assessmentLine: null,
        whatChanged,
        observations,
        discoveries,
        explanations: await this.selection.selectMany("explanation_line", ctx, player.id, 5),
      },
      meters,
    );

    let fileNotes = parseFileNotes(player.file_notes);
    if (player.character_locked && observations.length > 0) {
      const candidate = pickNewObservation(
        observations.map((o) => o.displayText),
        fileNotes,
      );
      if (candidate && (factChanges.length > 0 || Math.random() < 0.25)) {
        fileNotes = appendFileNote(fileNotes, candidate);
      }
    }

    await this.db
      .from("player_profiles")
      .update({
        interpretation_state: interpretation,
        player_tags: playerTags,
        file_notes: fileNotes,
      })
      .eq("id", player.id);

    await this.logSelectionRun(player.id, "selection", {
      factChangeCount: factChanges.length,
    });
  }

  private async selectLogEntry(
    player: PlayerProfile,
    contentType: ContentType,
    eventFamily: string,
    playerTags: string[],
    meters: LoreMeters,
    entryType: EntryType,
    sourceSummary: Record<string, unknown>,
  ): Promise<LifeEntry | null> {
    const ctx = this.buildContext(
      player,
      eventFamily,
      playerTags,
      meters,
      player.blocked_tags,
      player.preferred_tags,
      player.player_tags,
    );

    const pick = await this.selection.selectOne(contentType, ctx, player.id);
    if (!pick) return null;

    const row = await this.selection.saveSelection(
      player.id,
      pick,
      contentType,
      eventFamily,
      sourceSummary,
    );

    if (entryType === "ambient") {
      await this.db
        .from("player_profiles")
        .update({ last_ambient_at: new Date().toISOString() })
        .eq("id", player.id);
    }

    await this.logSelectionRun(player.id, entryType === "ambient" ? "ambient" : "snapshot_change", {
      contentType,
    });

    return this.historyToEntry(row, entryType);
  }

  private buildContext(
    player: PlayerProfile,
    eventFamily: string,
    playerTags: string[],
    meters: LoreMeters,
    blockedTags: string[],
    preferredTags: string[],
    archetypeTags: string[],
  ): SelectionContext {
    return {
      playerTags,
      canonTags: player.canon_tags ?? [],
      blockedTags,
      preferredTags,
      archetypeTags,
      loreMeters: meters,
      eventFamily,
    };
  }

  private async logSelectionRun(
    playerId: string,
    trigger: GenerationTrigger,
    summary: Record<string, unknown>,
  ): Promise<void> {
    await this.db.from("generation_runs").insert({
      player_id: playerId,
      trigger_type: trigger,
      input_summary: summary,
      output_summary: { mode: "selection" },
      tokens_used: 0,
      success: true,
    });
  }

  private shouldGenerateAmbient(player: PlayerProfile): boolean {
    if (!player.last_ambient_at) return true;
    const hoursSince =
      (Date.now() - new Date(player.last_ambient_at).getTime()) / (1000 * 60 * 60);
    return hoursSince >= AMBIENT_INTERVAL_HOURS;
  }

  private historyToEntry(row: SelectedContentRow, entryType: EntryType): LifeEntry {
    const ctx = row.selection_context as Record<string, unknown>;
    return {
      id: row.id,
      player_id: row.player_profile_id,
      content: row.display_text,
      entry_type: entryType,
      feedback_status: (row.feedback_status as FeedbackStatus) ?? "none",
      superseded_by: null,
      feedback_notes: [],
      is_canon: row.was_pinned_canon,
      source_type: row.event_family,
      source_summary: ctx,
      tone_tags: [],
      created_at: row.selected_at,
    };
  }

  private async getHistoryEntry(id: string): Promise<LifeEntry> {
    const { data, error } = await this.db
      .from("selected_content_history")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) throw new Error("Entry not found");
    return this.historyToEntry(data as SelectedContentRow, "selected");
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

  private async getPlayerById(id: string): Promise<PlayerProfile> {
    const { data, error } = await this.db
      .from("player_profiles")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) throw new Error("Player not found");
    return this.mapProfile(data);
  }

  private mapProfile(row: Record<string, unknown>): PlayerProfile {
    return {
      id: row.id as string,
      torn_user_id: row.torn_user_id as number | null,
      username: row.username as string,
      civilian_name: (row.civilian_name as string | null) ?? null,
      age: row.age as number | null,
      archetype: row.archetype as string,
      secondary_archetypes: (row.secondary_archetypes as string[]) ?? [],
      emerging_archetypes: (row.emerging_archetypes as string[]) ?? [],
      archetype_scores: (row.archetype_scores as Record<string, number>) ?? {},
      player_tags: (row.player_tags as string[]) ?? [],
      canon_tags: (row.canon_tags as string[]) ?? [],
      blocked_tags: (row.blocked_tags as string[]) ?? [],
      preferred_tags: (row.preferred_tags as string[]) ?? [],
      lore_meters: parseLoreMeters(row.lore_meters),
      character_state: parseCharacterState(row.character_state),
      assessment_data: parseAssessmentData(row.assessment_data),
      file_notes: parseFileNotes(row.file_notes),
      character_facts: parseCharacterFacts(row.character_facts),
      interpretation_state: parseInterpretationState(row.interpretation_state),
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

function parseInterpretationState(raw: unknown): PlayerProfile["interpretation_state"] {
  if (!raw || typeof raw !== "object") return null;
  return raw as PlayerProfile["interpretation_state"];
}

function parseCharacterFacts(raw: unknown): CharacterFacts | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as CharacterFacts;
  if (!r.username) return null;
  return r;
}

let engine: CharacterEngine | null = null;

export function getCharacterEngine(): CharacterEngine {
  if (!engine) engine = new CharacterEngine();
  return engine;
}
