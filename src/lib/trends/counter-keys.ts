import type { ActivityCounters, CounterDelta } from "./types";

/** Personalstats keys we track for snapshot deltas and rollups */
export const TRACKED_COUNTER_KEYS = [
  "alcoholused",
  "drugsused",
  "medicalitemsused",
  "xantaken",
  "exttaken",
  "cantaken",
  "energydrinkused",
  "attackswon",
  "attackslost",
  "attacksdraw",
  "hospital",
  "jailed",
  "criminaloffenses",
  "vandalism",
  "theft",
  "fraud",
  "networth",
  "moneyonhand",
  "donations",
  "itemsbought",
  "itemssent",
  "traveltimes",
  "moneymugged",
  "missionscompleted",
  "organisedcrimes",
  "refills",
  "nerverefills",
] as const;

export type TrackedCounterKey = (typeof TRACKED_COUNTER_KEYS)[number];

export const COUNTER_ACTIVITY_MAP: Record<string, string> = {
  alcoholused: "alcohol_use",
  drugsused: "drug_use",
  medicalitemsused: "medical_item_use",
  xantaken: "drug_use",
  exttaken: "drug_use",
  cantaken: "drug_use",
  energydrinkused: "item_use",
  attackswon: "fights_won",
  attackslost: "fights_lost",
  attacksdraw: "fights_draw",
  hospital: "hospital",
  jailed: "jail",
  criminaloffenses: "crime",
  vandalism: "crime",
  theft: "crime",
  fraud: "crime",
  networth: "money_networth",
  moneyonhand: "money_cash",
  donations: "church_donation",
  itemsbought: "purchases",
  itemssent: "items_sent",
  traveltimes: "travel",
  moneymugged: "money_lost_mugging",
  missionscompleted: "missions",
  organisedcrimes: "crime",
  refills: "gambling",
  nerverefills: "gambling",
};

export function extractCounters(
  personalstats: Record<string, number | string | undefined> | undefined,
): ActivityCounters {
  const out: ActivityCounters = {};
  if (!personalstats) return out;
  for (const key of TRACKED_COUNTER_KEYS) {
    const val = personalstats[key];
    if (typeof val === "number" && Number.isFinite(val)) {
      out[key] = val;
    }
  }
  return out;
}

export function computeCounterDeltas(
  previous: ActivityCounters,
  current: ActivityCounters,
): CounterDelta[] {
  const keys = new Set([...Object.keys(previous), ...Object.keys(current)]);
  const deltas: CounterDelta[] = [];
  for (const key of keys) {
    const prev = previous[key] ?? 0;
    const cur = current[key] ?? 0;
    const delta = cur - prev;
    if (delta !== 0) {
      deltas.push({ key, previous: prev, current: cur, delta });
    }
  }
  return deltas;
}

export function deltasToCounterRecord(deltas: CounterDelta[]): ActivityCounters {
  const out: ActivityCounters = {};
  for (const d of deltas) {
    if (d.delta > 0) out[d.key] = d.delta;
  }
  return out;
}

export function deriveTagsFromDeltas(deltas: CounterDelta[]): string[] {
  const tags = new Set<string>();
  for (const d of deltas) {
    if (d.delta <= 0) continue;
    const activity = COUNTER_ACTIVITY_MAP[d.key];
    if (activity) tags.add(activity);
    tags.add(d.key);
    if (d.key === "alcoholused") {
      tags.add("vice");
      tags.add("alcohol");
    }
    if (
      d.key.includes("drug") ||
      d.key.includes("xan") ||
      d.key.includes("medical")
    ) {
      tags.add("vice");
      tags.add("drug_use");
    }
    if (d.key.startsWith("attack")) {
      tags.add("fights");
      tags.add("heat");
    }
    if (d.key === "hospital") {
      tags.add("hospital");
      tags.add("injury");
    }
    if (d.key === "jailed") {
      tags.add("jail");
      tags.add("heat");
    }
    if (d.key === "networth" && d.delta > 0) tags.add("money_gain");
    if (d.key === "networth" && d.delta < 0) tags.add("money_loss");
    if (d.key === "donations") {
      tags.add("church");
      tags.add("charity");
    }
  }
  return [...tags];
}

export function mergeCounterMaps(
  a: ActivityCounters,
  b: ActivityCounters,
): ActivityCounters {
  const out = { ...a };
  for (const [key, val] of Object.entries(b)) {
    out[key] = (out[key] ?? 0) + val;
  }
  return out;
}
