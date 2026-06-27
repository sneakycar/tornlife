import { probeTornApiAccess } from "../src/lib/torn/client";
import { createServiceClient } from "../src/lib/db/client";
import { buildDataCoverageReport } from "../src/lib/trends/coverage";
import { CharacterEngine } from "../src/lib/character/engine";

async function main() {
  const apiKey = process.env.MY_TORN_API_KEY;
  if (!apiKey) throw new Error("MY_TORN_API_KEY missing");

  const probe = await probeTornApiAccess(apiKey);
  console.log("=== API PROBE ===");
  console.log(JSON.stringify(probe, null, 2));

  const db = createServiceClient();
  const { data: player } = await db
    .from("player_profiles")
    .select("id, username")
    .limit(1)
    .single();
  if (!player) throw new Error("no player");

  console.log("\n=== SYNC ===");
  const engine = new CharacterEngine();
  const result = await engine.sync();
  console.log("sync ok:", result.username, result.snapshotAt);

  const coverage = await buildDataCoverageReport(player.id, apiKey);
  console.log("\n=== DATA COVERAGE ===");
  console.log(
    JSON.stringify(
      {
        overall_confidence: coverage.overall_confidence,
        history_window_days: coverage.history_window_days,
        v1_log: coverage.v1_log,
        v2_events: coverage.v2_events,
        alcohol_use: coverage.alcohol_use,
        item_use: coverage.item_use,
        fights: coverage.fights,
        money_movement: coverage.money_movement,
        crimes: coverage.crimes,
        hospital_jail: coverage.hospital_jail,
        snapshot_count: coverage.snapshot_count,
        sync_delta_count: coverage.sync_delta_count,
        unavailable_reasons: coverage.unavailable_reasons,
        trend_facts_count: coverage.trend_facts.length,
        trend_facts_sample: coverage.trend_facts.slice(0, 8),
        lifetime_alcohol: coverage.lifetime_counters.alcoholused,
        deltas_7d: coverage.recent_deltas_7d,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
