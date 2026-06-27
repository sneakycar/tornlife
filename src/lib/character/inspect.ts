import { createServiceClient } from "../db/client";
import type { PlayerProfile } from "../db/types";
import { normalizeTornSnapshot } from "../snapshot/normalize";
import { compareSnapshots } from "../snapshot/compare";
import { buildFactChanges } from "../snapshot/fact-changes";
import { fetchTornUser } from "../torn/client";
import { classifyPlayerTags } from "../selection/tags";
import { computeArchetypes, driftArchetypeScores } from "../selection/archetypes";
import { computeLoreMeters, driftMeters } from "../selection/meters";
import { detectPrimaryEvent, eventFamilyChain } from "../selection/events";
import { getSelectionEngine } from "../selection/engine";
import { filterEligibleSeeds, rankCandidates } from "../selection/score";
import type { ContentType } from "../selection/constants";
import type { SelectionContext } from "../selection/types";
import { getCharacterEngine } from "./engine";
import type { EngineInspection, SelectionProbe } from "./inspect-types";
import type { DataCoverageReport } from "../trends/types";
import { buildDataCoverageReport } from "../trends/coverage";

const PROBE_TYPES: ContentType[] = [
  "character_assessment_line",
  "current_state",
  "what_changed",
  "recent_observation",
  "ambient_life",
  "explanation_line",
];

export async function inspectEngine(options?: {
  refreshTorn?: boolean;
}): Promise<EngineInspection> {
  const engine = getCharacterEngine();
  const selection = getSelectionEngine();
  const db = createServiceClient();

  const player = await engine.getProfile();
  let normalized = await engine.getLatestNormalizedSummary(player.id);
  let snapshotAt: string | null = null;

  if (options?.refreshTorn) {
    const apiKey = process.env.MY_TORN_API_KEY;
    if (!apiKey) throw new Error("MY_TORN_API_KEY is not configured");
    const tornData = await fetchTornUser(apiKey);
    normalized = normalizeTornSnapshot(tornData);
    snapshotAt = new Date().toISOString();
  } else if (normalized) {
    const snap = await engine.getLatestSnapshotMeta(player.id);
    snapshotAt = snap?.created_at ?? null;
  }

  const previous = await engine.getPreviousNormalizedSummary(player.id);
  const changes = normalized
    ? compareSnapshots(previous, normalized)
    : { hasMeaningfulChanges: false, changes: [], narrativeHints: [] };
  const factChanges = normalized ? buildFactChanges(previous, normalized) : [];

  const playerTags = normalized
    ? classifyPlayerTags(normalized, changes, factChanges)
    : player.player_tags;
  const eventFamily = normalized
    ? detectPrimaryEvent(
        changes,
        factChanges,
        player.character_locked ? "sync" : "assessment",
      )
    : "quiet_day";
  const families = eventFamilyChain(eventFamily);

  const archetypes = normalized
    ? computeArchetypes(normalized)
    : {
        primary: player.archetype,
        secondary: player.secondary_archetypes,
        emerging: player.emerging_archetypes,
        scores: player.archetype_scores,
        tags: player.player_tags,
      };
  const computedMeters = normalized
    ? computeLoreMeters(normalized)
    : player.lore_meters;
  const driftedMeters = driftMeters(player.lore_meters, computedMeters);
  const driftedScores = driftArchetypeScores(
    player.archetype_scores ?? {},
    archetypes.scores,
  );

  const ctx: SelectionContext = {
    playerTags,
    canonTags: player.canon_tags ?? [],
    blockedTags: player.blocked_tags ?? [],
    preferredTags: player.preferred_tags ?? [],
    archetypeTags: archetypes.tags,
    loreMeters: driftedMeters,
    eventFamily,
  };

  const history = await selection.getPlayerHistory(player.id, 20);
  const selectionProbes: SelectionProbe[] = [];

  for (const contentType of PROBE_TYPES) {
    const probe = await probeSelection(
      selection,
      contentType,
      ctx,
      player.id,
      families,
    );
    selectionProbes.push(probe);
  }

  const { count } = await db
    .from("content_seeds")
    .select("*", { count: "exact", head: true })
    .eq("approved", true)
    .eq("active", true);

  const apiKey = process.env.MY_TORN_API_KEY;
  let dataCoverage: DataCoverageReport;
  if (apiKey) {
    let tornForCoverage: Awaited<ReturnType<typeof fetchTornUser>> | undefined;
    if (options?.refreshTorn) {
      tornForCoverage = await fetchTornUser(apiKey);
    }
    dataCoverage = await buildDataCoverageReport(
      player.id,
      apiKey,
      tornForCoverage,
    );
  } else {
    dataCoverage = await buildDataCoverageReport(player.id, "", undefined);
  }

  return {
    inspectedAt: new Date().toISOString(),
    username: player.username,
    tornUserId: player.torn_user_id,
    characterLocked: player.character_locked,
    normalizedSummary: normalized,
    snapshotAt,
    meaningfulChanges: changes.hasMeaningfulChanges,
    changes: changes.changes,
    narrativeHints: changes.narrativeHints,
    factChanges,
    playerTags,
    eventFamily,
    eventFamilyChain: families,
    archetypes,
    archetypeScoresStored: driftedScores,
    loreMetersStored: player.lore_meters,
    loreMetersComputed: driftedMeters,
    selectionContext: {
      canonTags: ctx.canonTags,
      blockedTags: ctx.blockedTags,
      preferredTags: ctx.preferredTags,
      archetypeTags: ctx.archetypeTags,
    },
    selectionProbes,
    recentHistory: history.map((h) => ({
      id: h.id,
      contentType: h.content_type,
      eventFamily: h.event_family,
      displayText: h.display_text,
      selectedAt: h.selected_at,
      feedbackStatus: h.feedback_status,
    })),
    libraryStats: { approvedSeeds: count ?? 0 },
    dataCoverage,
  };
}

async function probeSelection(
  selection: ReturnType<typeof getSelectionEngine>,
  contentType: ContentType,
  ctx: SelectionContext,
  playerId: string,
  families: string[],
): Promise<SelectionProbe> {
  const history = await selection.getPlayerHistory(playerId);
  let poolSize = 0;
  let eligibleCount = 0;
  let relaxLevel = -1;
  let topCandidates: SelectionProbe["topCandidates"] = [];
  let wouldSelect: string | null = null;

  for (let relax = 0; relax < 3; relax++) {
    const relaxCanon = relax >= 1;
    const familySlice = relax === 0 ? families : families.slice(relax);
    const seeds = await selection.fetchCandidates(contentType, familySlice);
    poolSize = seeds.length;
    const eligible = filterEligibleSeeds(seeds, ctx, history, { relaxCanon });
    if (!eligible.length) continue;

    relaxLevel = relax;
    eligibleCount = eligible.length;
    const ranked = rankCandidates(eligible, ctx, history).slice(0, 8);
    topCandidates = ranked.map((r) => ({
      seedId: r.seed.id,
      text: r.seed.text,
      score: Math.round(r.score),
      eventFamily: r.seed.event_family,
      toneTags: r.seed.tone_tags,
    }));
    wouldSelect = ranked[0]?.seed.text ?? null;
    break;
  }

  return {
    contentType,
    eventFamiliesQueried: families,
    poolSize,
    eligibleCount,
    relaxLevel,
    topCandidates,
    wouldSelect,
  };
}
