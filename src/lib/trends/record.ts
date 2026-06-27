import { createServiceClient } from "../db/client";
import type { TornUserResponse } from "../torn/types";
import { fetchTornEvents } from "../torn/client";
import {
  computeCounterDeltas,
  deltasToCounterRecord,
  deriveTagsFromDeltas,
  extractCounters,
  mergeCounterMaps,
} from "./counter-keys";
import { parseTornEvent } from "./event-parser";
import type { ActivityCounters } from "./types";

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function weekStart(d: Date): string {
  const copy = new Date(d);
  const day = copy.getUTCDay();
  const diff = (day + 6) % 7;
  copy.setUTCDate(copy.getUTCDate() - diff);
  return dateKey(copy);
}

function monthStart(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

async function upsertRollup(
  table: "normalized_daily_activity" | "normalized_weekly_activity" | "normalized_monthly_activity",
  playerId: string,
  periodKey: string,
  keyField: "activity_date" | "week_start" | "month_start",
  deltaCounters: ActivityCounters,
  tags: string[],
): Promise<void> {
  const db = createServiceClient();
  const { data: existing } = await db
    .from(table)
    .select("counters, trend_tags")
    .eq("player_profile_id", playerId)
    .eq(keyField, periodKey)
    .maybeSingle();

  const merged = mergeCounterMaps(
    (existing?.counters as ActivityCounters) ?? {},
    deltaCounters,
  );
  const mergedTags = [
    ...new Set([...((existing?.trend_tags as string[]) ?? []), ...tags]),
  ];

  await db.from(table).upsert(
    {
      player_profile_id: playerId,
      [keyField]: periodKey,
      counters: merged,
      trend_tags: mergedTags,
      updated_at: new Date().toISOString(),
    },
    { onConflict: `player_profile_id,${keyField}` },
  );
}

export async function recordTrendData(input: {
  playerId: string;
  snapshotId: string;
  previousSnapshotId: string | null;
  tornData: TornUserResponse;
  apiKey: string;
}): Promise<void> {
  const db = createServiceClient();
  const now = new Date();
  const current = extractCounters(input.tornData.personalstats);

  let previous: ActivityCounters = {};
  if (input.previousSnapshotId) {
    const { data: prevSnap } = await db
      .from("torn_snapshots")
      .select("raw_data")
      .eq("id", input.previousSnapshotId)
      .maybeSingle();
    if (prevSnap?.raw_data) {
      const raw = prevSnap.raw_data as TornUserResponse;
      previous = extractCounters(raw.personalstats);
    }
  }

  const deltas = computeCounterDeltas(previous, current);
  const deltaRecord = deltasToCounterRecord(deltas);
  const tags = deriveTagsFromDeltas(deltas);

  if (input.previousSnapshotId && deltas.length > 0) {
    await db.from("tracked_activity_counters").insert({
      player_profile_id: input.playerId,
      snapshot_id: input.snapshotId,
      previous_snapshot_id: input.previousSnapshotId,
      counters: {
        deltas: deltas.map((d) => ({
          key: d.key,
          previous: d.previous,
          current: d.current,
          delta: d.delta,
        })),
        rolled: deltaRecord,
      },
      derived_tags: tags,
    });
  }

  if (Object.keys(deltaRecord).length > 0) {
    await upsertRollup(
      "normalized_daily_activity",
      input.playerId,
      dateKey(now),
      "activity_date",
      deltaRecord,
      tags,
    );
    await upsertRollup(
      "normalized_weekly_activity",
      input.playerId,
      weekStart(now),
      "week_start",
      deltaRecord,
      tags,
    );
    await upsertRollup(
      "normalized_monthly_activity",
      input.playerId,
      monthStart(now),
      "month_start",
      deltaRecord,
      tags,
    );
  }

  try {
    const events = await fetchTornEvents(input.apiKey, 10);
    const rows = events.map((e) => {
      const parsed = parseTornEvent(e.id, e.timestamp, e.event);
      return {
        torn_event_id: parsed.torn_event_id,
        player_profile_id: input.playerId,
        event_timestamp: parsed.event_timestamp.toISOString(),
        raw_text: parsed.raw_text,
        parsed_category: parsed.parsed_category,
        parsed_tags: parsed.parsed_tags,
        fetched_at: new Date().toISOString(),
      };
    });
    if (rows.length > 0) {
      await db.from("torn_event_cache").upsert(rows, {
        onConflict: "player_profile_id,torn_event_id",
      });
    }
  } catch {
    // Events import is best-effort; coverage report will reflect failures
  }
}
