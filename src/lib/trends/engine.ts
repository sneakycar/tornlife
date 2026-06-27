import type { ActivityCounters, TrendDirection, TrendFact } from "./types";
import { COUNTER_ACTIVITY_MAP, mergeCounterMaps } from "./counter-keys";
import type { ParsedTornEvent } from "./event-parser";
import { countEventsByTag } from "./event-parser";

function classifyTrend(
  count: number,
  previous?: number,
): TrendDirection {
  if (count >= 1000) return "extreme";
  if (previous === undefined) return count > 0 ? "increasing" : "stable";
  if (count > previous * 1.25) return "increasing";
  if (count < previous * 0.75) return "decreasing";
  return "stable";
}

function sumCounters(rows: ActivityCounters[]): ActivityCounters {
  return rows.reduce((acc, row) => mergeCounterMaps(acc, row), {});
}

export function buildTrendFacts(input: {
  lifetime: ActivityCounters;
  deltas24h: ActivityCounters;
  deltas7d: ActivityCounters;
  deltas30d: ActivityCounters;
  deltasPrior7d: ActivityCounters;
  monthLabel: string;
  events7d: ParsedTornEvent[];
  events30d: ParsedTornEvent[];
}): TrendFact[] {
  const facts: TrendFact[] = [];
  const now = new Date();
  const since7d = new Date(now.getTime() - 7 * 86400000);
  const eventCounts7d = countEventsByTag(input.events7d, since7d);

  const addCounterFact = (
    window: string,
    key: string,
    count: number,
    previous?: number,
    confidence: TrendFact["confidence"] = "medium",
    source: TrendFact["source"] = "rollup",
    note?: string,
  ) => {
    if (count <= 0 && (previous ?? 0) <= 0) return;
    const activity = COUNTER_ACTIVITY_MAP[key] ?? key;
    facts.push({
      window,
      activity,
      item: key,
      count,
      previous_count: previous,
      trend: classifyTrend(count, previous),
      confidence,
      source,
      tags: [activity, key],
      note,
    });
  };

  // 24h deltas — only high confidence if we have sync deltas in window
  const has24h = Object.keys(input.deltas24h).length > 0;
  for (const [key, count] of Object.entries(input.deltas24h)) {
    addCounterFact(
      "24_hours",
      key,
      count,
      undefined,
      has24h ? "high" : "low",
      "snapshot_delta",
      has24h ? undefined : "Requires repeated syncs within 24h",
    );
  }

  // 7 day rollup
  for (const [key, count] of Object.entries(input.deltas7d)) {
    const prev = input.deltasPrior7d[key] ?? 0;
    addCounterFact(
      "7_days",
      key,
      count,
      prev,
      Object.keys(input.deltas7d).length > 0 ? "medium" : "low",
      "rollup",
      "Built from stored sync deltas; accuracy improves with polling frequency",
    );
  }

  // Monthly
  for (const [key, count] of Object.entries(input.deltas30d)) {
    if (count <= 0) continue;
    addCounterFact(
      input.monthLabel,
      key,
      count,
      undefined,
      "medium",
      "rollup",
    );
  }

  // Lifetime context (low confidence for recent behavior — cumulative only)
  if (input.lifetime.alcoholused && input.lifetime.alcoholused > 0) {
    facts.push({
      window: "lifetime",
      activity: "alcohol_use",
      item: "alcoholused",
      count: input.lifetime.alcoholused,
      trend: input.lifetime.alcoholused > 500 ? "extreme" : "stable",
      confidence: "low",
      source: "snapshot_delta",
      tags: ["alcohol_use", "vice", "alcohol"],
      note: "Lifetime counter only — not a recent window unless sync deltas exist",
    });
  }

  // Event-based fight trends (higher confidence when events available)
  const fightEvents = (eventCounts7d.fights ?? 0) + (eventCounts7d.fight ?? 0);
  if (fightEvents > 0) {
    facts.push({
      window: "7_days",
      activity: "fights",
      count: fightEvents,
      trend: fightEvents > 20 ? "increasing" : "stable",
      confidence: "high",
      source: "torn_event",
      tags: ["fights", "heat"],
    });
  }

  const hospitalEvents = eventCounts7d.hospital ?? 0;
  if (hospitalEvents > 0) {
    facts.push({
      window: "7_days",
      activity: "hospital",
      count: hospitalEvents,
      trend: "increasing",
      confidence: "medium",
      source: "torn_event",
      tags: ["hospital", "injury"],
    });
  }

  return facts.sort((a, b) => b.count - a.count).slice(0, 20);
}

export function sumTrackedRows(
  rows: Array<{ counters: ActivityCounters; recorded_at?: string }>,
  since?: Date,
): ActivityCounters {
  const filtered = since
    ? rows.filter((r) => r.recorded_at && new Date(r.recorded_at) >= since)
    : rows;
  return sumCounters(filtered.map((r) => r.counters));
}
