import { createServiceClient } from "../db/client";
import type { CharacterFacts } from "../db/types";
import type { TornUserResponse } from "../torn/types";
import {
  buildCallbacks,
  loadRecentMemory,
  recordMemoryFromDelta,
} from "./memory";
import { decideRhythm, nextRhythm } from "./rhythm";
import { detectThreads, threadWritingTags } from "./threads";
import type {
  LifeEngineSnapshot,
  LifeEngineState,
  LifeVariables,
  StoryRhythm,
  StoryThread,
} from "./types";
import { DEFAULT_LIFE_VARIABLES, evolveVariables, variablesToWritingTags } from "./variables";
import { loadRollingWindows, loadSyncDelta } from "./windows";

function parseState(raw: unknown): LifeEngineState {
  const r = (raw ?? {}) as Partial<LifeEngineState>;
  return {
    variables: { ...DEFAULT_LIFE_VARIABLES, ...(r.variables as LifeVariables) },
    rhythm: {
      last_entry_at: r.rhythm?.last_entry_at ?? null,
      entries_last_7d: r.rhythm?.entries_last_7d ?? 0,
      quiet_sync_streak: r.rhythm?.quiet_sync_streak ?? 0,
      last_sync_at: r.rhythm?.last_sync_at ?? null,
    },
    windows: r.windows ?? {
      today: {},
      days7: {},
      days30: {},
      days90: {},
      lifetime: {},
    },
    consequence_tags: r.consequence_tags ?? [],
    updated_at: r.updated_at ?? null,
  };
}

async function loadThreads(playerId: string): Promise<StoryThread[]> {
  const db = createServiceClient();
  const { data } = await db
    .from("life_story_threads")
    .select("*")
    .eq("player_profile_id", playerId);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    thread_key: row.thread_key as string,
    label: row.label as string,
    status: row.status as StoryThread["status"],
    intensity: Number(row.intensity) || 0,
    started_at: row.started_at as string,
    last_reinforced_at: row.last_reinforced_at as string,
    evidence: (row.evidence as Record<string, unknown>) ?? {},
  }));
}

async function saveThreads(
  playerId: string,
  threads: Array<Omit<StoryThread, "id"> & { thread_key: string }>,
): Promise<StoryThread[]> {
  const db = createServiceClient();
  const saved: StoryThread[] = [];

  for (const t of threads) {
    const { data, error } = await db
      .from("life_story_threads")
      .upsert(
        {
          player_profile_id: playerId,
          thread_key: t.thread_key,
          label: t.label,
          status: t.status,
          intensity: t.intensity,
          started_at: t.started_at,
          last_reinforced_at: t.last_reinforced_at,
          evidence: t.evidence,
        },
        { onConflict: "player_profile_id,thread_key" },
      )
      .select("*")
      .single();

    if (!error && data) {
      saved.push({
        id: data.id as string,
        thread_key: data.thread_key as string,
        label: data.label as string,
        status: data.status as StoryThread["status"],
        intensity: Number(data.intensity) || 0,
        started_at: data.started_at as string,
        last_reinforced_at: data.last_reinforced_at as string,
        evidence: (data.evidence as Record<string, unknown>) ?? {},
      });
    }
  }

  const activeKeys = new Set(threads.map((t) => t.thread_key));
  const existing = await loadThreads(playerId);
  for (const old of existing) {
    if (!activeKeys.has(old.thread_key) && old.status === "active") {
      await db
        .from("life_story_threads")
        .update({ status: "dormant" })
        .eq("id", old.id);
    }
  }

  return saved.length > 0 ? saved : await loadThreads(playerId);
}

async function countEntriesLast7d(playerId: string): Promise<number> {
  const db = createServiceClient();
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const { count } = await db
    .from("selected_content_history")
    .select("*", { count: "exact", head: true })
    .eq("player_profile_id", playerId)
    .gte("selected_at", since);
  return count ?? 0;
}

export async function runLifeEngine(input: {
  playerId: string;
  facts: CharacterFacts | null;
  tornData: TornUserResponse;
  hasMeaningfulChanges: boolean;
  storedState?: unknown;
}): Promise<LifeEngineSnapshot> {
  const prior = parseState(input.storedState);
  const windows = await loadRollingWindows(
    input.playerId,
    input.facts,
    input.tornData,
  );
  const syncDelta = await loadSyncDelta(input.playerId);

  const variables = evolveVariables(prior.variables, windows, syncDelta);

  if (input.facts?.company) {
    variables.routine = Math.min(100, variables.routine + 1.5);
    variables.respectability = Math.min(100, variables.respectability + 1);
    variables.professionalism = Math.min(100, variables.professionalism + 0.8);
    variables.business_instinct = Math.min(100, variables.business_instinct + 0.5);
  }
  const existingThreads = await loadThreads(input.playerId);
  const threadUpdates = detectThreads(windows, variables, existingThreads);
  const threads = await saveThreads(input.playerId, threadUpdates);

  if (Object.keys(syncDelta).length > 0) {
    await recordMemoryFromDelta(input.playerId, syncDelta, "today");
  }

  const memory = await loadRecentMemory(input.playerId);
  const callbacks = buildCallbacks(memory);

  const entries7d = await countEntriesLast7d(input.playerId);
  const rhythm: StoryRhythm = {
    ...prior.rhythm,
    entries_last_7d: entries7d,
  };

  const varTags = variablesToWritingTags(variables);
  const threadTags = threadWritingTags(threads.filter((t) => t.status === "active"));
  const consequence_tags = [...new Set([...varTags, ...threadTags])];

  const variablesHigh = Object.values(variables).some((v) => v >= 45);

  const rhythmDecision = decideRhythm({
    rhythm,
    syncDelta,
    hasMeaningfulChanges: input.hasMeaningfulChanges,
    activeThreads: threads,
    variablesHigh,
  });

  const state: LifeEngineState = {
    variables,
    rhythm,
    windows,
    consequence_tags,
    updated_at: new Date().toISOString(),
  };

  const db = createServiceClient();
  await db
    .from("player_profiles")
    .update({ life_engine_state: state })
    .eq("id", input.playerId);

  const writingTags = [
    ...consequence_tags,
    ...callbacks.map((c) => `callback:${c.slice(0, 40)}`),
  ];

  return {
    state,
    threads: threads.filter((t) => t.status !== "dormant"),
    memory,
    callbacks,
    writingTags,
    rhythmDecision,
  };
}

export async function loadLifeEngineSnapshot(
  playerId: string,
  storedState?: unknown,
): Promise<LifeEngineSnapshot> {
  const state = parseState(storedState);
  const db = createServiceClient();
  const { data: threadRows } = await db
    .from("life_story_threads")
    .select("*")
    .eq("player_profile_id", playerId)
    .neq("status", "dormant");

  const memory = await loadRecentMemory(playerId);
  const threads: StoryThread[] = (threadRows ?? []).map((row) => ({
    id: row.id as string,
    thread_key: row.thread_key as string,
    label: row.label as string,
    status: row.status as StoryThread["status"],
    intensity: Number(row.intensity) || 0,
    started_at: row.started_at as string,
    last_reinforced_at: row.last_reinforced_at as string,
    evidence: (row.evidence as Record<string, unknown>) ?? {},
  }));

  return {
    state,
    threads,
    memory,
    callbacks: buildCallbacks(memory),
    writingTags: state.consequence_tags,
    rhythmDecision: {
      should_write: false,
      intensity: "low",
      reason: "loaded",
    },
  };
}

export async function markRhythmWrote(playerId: string, storedState: unknown): Promise<void> {
  const prior = parseState(storedState);
  const next = nextRhythm(prior.rhythm, true);
  const db = createServiceClient();
  await db
    .from("player_profiles")
    .update({
      life_engine_state: {
        ...prior,
        rhythm: next,
        updated_at: new Date().toISOString(),
      },
    })
    .eq("id", playerId);
}

export async function markRhythmQuiet(playerId: string, storedState: unknown): Promise<void> {
  const prior = parseState(storedState);
  const next = nextRhythm(prior.rhythm, false);
  const db = createServiceClient();
  await db
    .from("player_profiles")
    .update({
      life_engine_state: {
        ...prior,
        rhythm: next,
        updated_at: new Date().toISOString(),
      },
    })
    .eq("id", playerId);
}

export { parseState as parseLifeEngineState };
