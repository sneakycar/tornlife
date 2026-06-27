import { createServiceClient } from "../db/client";
import { probeTornApiAccess } from "../torn/client";
import { extractCounters } from "./counter-keys";
import { buildTrendFacts, sumTrackedRows } from "./engine";
import { parseTornEvent } from "./event-parser";
import type { DataCoverageReport, TrendConfidence } from "./types";
import type { TornUserResponse } from "../torn/types";

function monthLabel(d: Date): string {
  return d.toLocaleString("en-US", { month: "long", year: "numeric" }).toLowerCase().replace(" ", "_");
}

export async function buildDataCoverageReport(
  playerId: string,
  apiKey: string,
  latestTornData?: TornUserResponse,
): Promise<DataCoverageReport> {
  const db = createServiceClient();
  const probe = apiKey
    ? await probeTornApiAccess(apiKey)
    : {
        v1_log_available: false,
        v1_log_error: "No API key",
        v2_events_available: false,
        v2_events_count: 0,
        v2_events_oldest: null,
        v2_events_newest: null,
        v2_events_span_days: 0,
        personalstats_available: false,
      };
  const unavailable_reasons: string[] = [];

  if (!probe.v1_log_available) {
    unavailable_reasons.push(
      `v1 log: ${probe.v1_log_error ?? "unavailable — API key may need higher access level"}`,
    );
  }
  if (!probe.v2_events_available) {
    unavailable_reasons.push("v2 events: unavailable");
  }
  if (!probe.personalstats_available) {
    unavailable_reasons.push("personalstats: unavailable");
  }

  const { data: snapshots } = await db
    .from("torn_snapshots")
    .select("created_at")
    .eq("player_id", playerId)
    .order("created_at", { ascending: true });

  const snapshot_count = snapshots?.length ?? 0;
  let snapshot_tracking_days = 0;
  if (snapshots && snapshots.length >= 2) {
    const first = new Date(snapshots[0].created_at).getTime();
    const last = new Date(snapshots[snapshots.length - 1].created_at).getTime();
    snapshot_tracking_days = Math.max(0, (last - first) / 86400000);
  } else if (snapshots?.length === 1) {
    snapshot_tracking_days = 0;
    unavailable_reasons.push(
      "Only one snapshot stored — trend deltas require repeated syncs over time",
    );
  }

  const { count: sync_delta_count } = await db
    .from("tracked_activity_counters")
    .select("*", { count: "exact", head: true })
    .eq("player_profile_id", playerId);

  const now = new Date();
  const since24h = new Date(now.getTime() - 86400000);
  const since7d = new Date(now.getTime() - 7 * 86400000);
  const since14d = new Date(now.getTime() - 14 * 86400000);
  const since30d = new Date(now.getTime() - 30 * 86400000);

  const { data: trackedRows } = await db
    .from("tracked_activity_counters")
    .select("counters, recorded_at")
    .eq("player_profile_id", playerId)
    .gte("recorded_at", since30d.toISOString())
    .order("recorded_at", { ascending: true });

  const rowDeltas = (trackedRows ?? []).map((r) => {
    const c = r.counters as { rolled?: Record<string, number> };
    return {
      counters: c.rolled ?? {},
      recorded_at: r.recorded_at as string,
    };
  });

  const deltas24h = sumTrackedRows(rowDeltas, since24h);
  const deltas7d = sumTrackedRows(rowDeltas, since7d);
  const deltas30d = sumTrackedRows(rowDeltas, since30d);
  const deltasPrior7d = sumTrackedRows(
    rowDeltas.filter(
      (r) =>
        r.recorded_at &&
        new Date(r.recorded_at) >= since14d &&
        new Date(r.recorded_at) < since7d,
    ),
  );

  const { data: cachedEvents } = await db
    .from("torn_event_cache")
    .select("torn_event_id, event_timestamp, raw_text, parsed_category, parsed_tags")
    .eq("player_profile_id", playerId)
    .order("event_timestamp", { ascending: false })
    .limit(500);

  const eventsParsed = (cachedEvents ?? []).map((e) =>
    parseTornEvent(
      e.torn_event_id as string,
      Math.floor(new Date(e.event_timestamp as string).getTime() / 1000),
      e.raw_text as string,
    ),
  );

  let lifetime: Record<string, number> = {};
  if (latestTornData?.personalstats) {
    lifetime = extractCounters(latestTornData.personalstats);
  } else {
    const { data: lastSnap } = await db
      .from("torn_snapshots")
      .select("raw_data")
      .eq("player_id", playerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastSnap?.raw_data) {
      lifetime = extractCounters(
        (lastSnap.raw_data as TornUserResponse).personalstats,
      );
    }
  }

  const history_window_days = Math.max(
    snapshot_tracking_days,
    probe.v2_events_span_days,
  );

  let overall_confidence: TrendConfidence = "low";
  if (snapshot_tracking_days >= 7 && (sync_delta_count ?? 0) >= 5) {
    overall_confidence = "medium";
  }
  if (snapshot_tracking_days >= 7 && probe.v2_events_available && (sync_delta_count ?? 0) >= 10) {
    overall_confidence = "high";
  }
  if (snapshot_count < 2) overall_confidence = "low";

  const trend_facts = buildTrendFacts({
    lifetime,
    deltas24h,
    deltas7d,
    deltas30d,
    deltasPrior7d,
    monthLabel: monthLabel(now),
    events7d: eventsParsed,
    events30d: eventsParsed,
  });

  return {
    assessed_at: new Date().toISOString(),
    user_profile: probe.personalstats_available ? "available" : "unavailable",
    v1_log: probe.v1_log_available ? "available" : "unavailable",
    v1_log_reason: probe.v1_log_error,
    v2_events: probe.v2_events_available ? "available" : "unavailable",
    v2_events_count: probe.v2_events_count,
    v2_events_oldest: probe.v2_events_oldest,
    v2_events_newest: probe.v2_events_newest,
    v2_events_span_days: Math.round(probe.v2_events_span_days * 10) / 10,
    personalstats: probe.personalstats_available ? "available" : "unavailable",
    personalstats_mode: probe.personalstats_available
      ? "lifetime_counters_only"
      : "unavailable",
    item_use:
      probe.personalstats_available || (sync_delta_count ?? 0) > 0
        ? "partial"
        : "unavailable",
    alcohol_use: lifetime.alcoholused
      ? "partial"
      : (sync_delta_count ?? 0) > 0
        ? "partial"
        : "unavailable",
    medical_drug_use:
      lifetime.medicalitemsused || lifetime.drugsused || lifetime.xantaken
        ? "partial"
        : "unavailable",
    fights:
      probe.v2_events_available || lifetime.attackswon
        ? probe.v2_events_available
          ? "available"
          : "partial"
        : "unavailable",
    money_movement: lifetime.networth ? "partial" : "unavailable",
    crimes:
      lifetime.criminaloffenses || probe.v2_events_available
        ? "partial"
        : "unavailable",
    hospital_jail: lifetime.hospital || lifetime.jailed ? "partial" : "unavailable",
    snapshot_tracking_days: Math.round(snapshot_tracking_days * 10) / 10,
    snapshot_count,
    sync_delta_count: sync_delta_count ?? 0,
    history_window_days: Math.round(history_window_days * 10) / 10,
    overall_confidence,
    lifetime_counters: lifetime,
    recent_deltas_24h: deltas24h,
    recent_deltas_7d: deltas7d,
    recent_deltas_month: deltas30d,
    trend_facts,
    unavailable_reasons,
  };
}
