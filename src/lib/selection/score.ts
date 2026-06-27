import { RARITY_WEIGHT_MOD } from "./constants";
import type { ContentSeed, ScoredCandidate, SelectionContext } from "./types";
import { tagsOverlap } from "./tags";
import { isOnCooldown, recentlyUsedPenalty } from "./cooldown";
import type { SelectedContentRow } from "./types";
import { metersPass } from "./meters";

export function filterEligibleSeeds(
  seeds: ContentSeed[],
  ctx: SelectionContext,
  history: SelectedContentRow[],
  options?: { relaxCanon?: boolean },
): ContentSeed[] {
  const allTags = [...ctx.playerTags, ...ctx.archetypeTags];
  const relaxCanon = options?.relaxCanon ?? false;

  return seeds.filter((seed) => {
    if (!seed.approved || !seed.active) return false;
    if (isOnCooldown(seed, history)) return false;
    if (!metersPass(ctx.loreMeters, seed.meter_min, seed.meter_max)) return false;

    for (const req of seed.required_tags) {
      if (!allTags.includes(req) && !ctx.playerTags.includes(req)) return false;
    }
    if (tagsOverlap(seed.blocked_tags, allTags)) return false;
    if (tagsOverlap(seed.blocked_tags, ctx.blockedTags)) return false;

    if (!relaxCanon) {
      for (const req of seed.canon_required_tags) {
        if (!ctx.canonTags.includes(req)) return false;
      }
      if (tagsOverlap(seed.canon_blocked_tags, ctx.canonTags)) return false;
    }

    return true;
  });
}

export function scoreCandidate(
  seed: ContentSeed,
  ctx: SelectionContext,
  history: SelectedContentRow[],
): number {
  let score = seed.weight + seed.quality_score * 0.5;
  const allTags = [...ctx.playerTags, ...ctx.archetypeTags, ...ctx.preferredTags];

  for (const tag of seed.archetype_tags) {
    if (ctx.archetypeTags.includes(tag)) score += 12;
  }
  for (const tag of seed.state_tags) {
    if (ctx.playerTags.includes(tag)) score += 10;
  }
  for (const tag of seed.tone_tags) {
    if (ctx.preferredTags.includes(tag)) score += 15;
    if (ctx.blockedTags.includes(tag)) score -= 40;
  }
  for (const tag of seed.state_tags) {
    if (ctx.preferredTags.includes(tag)) score += 8;
  }
  if (tagsOverlap(seed.tone_tags, ctx.blockedTags)) score -= 30;

  score += RARITY_WEIGHT_MOD[seed.rarity] ?? 0;
  score -= recentlyUsedPenalty(seed, history);

  if (seed.required_tags.length > 3) score += 5;

  return Math.max(1, score);
}

export function rankCandidates(
  seeds: ContentSeed[],
  ctx: SelectionContext,
  history: SelectedContentRow[],
): ScoredCandidate[] {
  return seeds
    .map((seed) => ({ seed, score: scoreCandidate(seed, ctx, history) }))
    .sort((a, b) => b.score - a.score);
}

export function weightedPick(candidates: ScoredCandidate[]): ScoredCandidate | null {
  if (!candidates.length) return null;
  const top = candidates.slice(0, Math.min(8, candidates.length));
  const total = top.reduce((sum, c) => sum + c.score, 0);
  let roll = Math.random() * total;
  for (const candidate of top) {
    roll -= candidate.score;
    if (roll <= 0) return candidate;
  }
  return top[top.length - 1];
}
