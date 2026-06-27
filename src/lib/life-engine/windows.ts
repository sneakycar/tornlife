import { createServiceClient } from "../db/client";
import type { CharacterFacts } from "../db/types";
import { extractCounters } from "../trends/counter-keys";
import { sumTrackedRows } from "../trends/engine";
import type { ActivityCounters } from "../trends/types";
import type { TornUserResponse } from "../torn/types";
import type { RollingWindows } from "./types";

export async function loadRollingWindows(
  playerId: string,
  lifetimeFromFacts?: CharacterFacts | null,
  latestRaw?: TornUserResponse,
): Promise<RollingWindows> {
  const db = createServiceClient();
  const now = new Date();

  const { data: rows } = await db
    .from("tracked_activity_counters")
    .select("counters, recorded_at")
    .eq("player_profile_id", playerId)
    .order("recorded_at", { ascending: true });

  const mapped = (rows ?? []).map((r) => {
    const c = r.counters as { rolled?: ActivityCounters };
    return { counters: c.rolled ?? {}, recorded_at: r.recorded_at as string };
  });

  const today = sumTrackedRows(
    mapped,
    new Date(now.getTime() - 86400000),
  );
  const days7 = sumTrackedRows(
    mapped,
    new Date(now.getTime() - 7 * 86400000),
  );
  const days30 = sumTrackedRows(
    mapped,
    new Date(now.getTime() - 30 * 86400000),
  );
  const days90 = sumTrackedRows(
    mapped,
    new Date(now.getTime() - 90 * 86400000),
  );

  let lifetime: ActivityCounters = {};
  if (latestRaw?.personalstats) {
    lifetime = extractCounters(latestRaw.personalstats);
  } else if (lifetimeFromFacts) {
    lifetime = {
      alcoholused: lifetimeFromFacts.alcohol_used ?? 0,
      criminaloffenses: lifetimeFromFacts.crimes ?? 0,
      hospital: lifetimeFromFacts.hospitalizations ?? 0,
      jailed: lifetimeFromFacts.jailed ?? 0,
      attackswon: lifetimeFromFacts.attacks_won ?? 0,
      donations: lifetimeFromFacts.donations ?? 0,
      drugsused: lifetimeFromFacts.drugs ?? 0,
      networth: lifetimeFromFacts.net_worth ?? 0,
      traveltimes: lifetimeFromFacts.travel_times ?? 0,
    };
  }

  return { today, days7, days30, days90, lifetime };
}

export async function loadSyncDelta(
  playerId: string,
): Promise<ActivityCounters> {
  const db = createServiceClient();
  const { data } = await db
    .from("tracked_activity_counters")
    .select("counters")
    .eq("player_profile_id", playerId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.counters) return {};
  const c = data.counters as { rolled?: ActivityCounters };
  return c.rolled ?? {};
}
