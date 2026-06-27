import type { CharacterFacts, LoreMeterKey, LoreMeters, NormalizedSummary } from "../db/types";
import { clampLoreMeters } from "../character/types";

function scale(value: number, min: number, max: number): number {
  if (max <= min) return 50;
  return Math.round(((value - min) / (max - min)) * 100);
}

export function computeLoreMeters(summary: NormalizedSummary): LoreMeters {
  const facts = summary.characterFacts;
  const keys = summary.comparisonKeys;

  const crimes = facts.crimes ?? Number(keys.criminaloffenses ?? 0);
  const hospital = facts.hospitalizations ?? Number(keys.hospital ?? 0);
  const jailed = facts.jailed ?? Number(keys.jailed ?? 0);
  const drugs = facts.drugs ?? Number(keys.drugs ?? 0);
  const alcohol = facts.alcohol_used ?? Number(keys.alcoholused ?? 0);
  const attacks = facts.attacks_won ?? Number(keys.attackswon ?? 0);
  const netWorth = facts.net_worth ?? Number(keys.networth ?? 0);
  const donations = facts.donations ?? Number(keys.donations ?? 0);

  const heat = clampLoreMeters({
    heat: scale(crimes + hospital * 5 + jailed * 8 + attacks * 0.5, 0, 500),
    luck: 50,
    rot: 50,
    rep: 50,
    vice: 50,
    debt: 50,
  }).heat;

  const vice = scale(drugs * 3 + alcohol * 2, 0, 200);
  const rep = scale(donations * 2 + attacks * 0.3, 0, 150);
  const luck = scale(netWorth, 0, 100_000_000);
  const debt = netWorth < 2_000_000 ? scale(2_000_000 - netWorth, 0, 2_000_000) : 15;
  const rot = scale(hospital * 4 + drugs, 0, 100);

  return clampLoreMeters({ heat, luck, rot, rep, vice, debt });
}

export function driftMeters(current: LoreMeters, next: LoreMeters): LoreMeters {
  const result = { ...current };
  for (const key of Object.keys(next) as LoreMeterKey[]) {
    result[key] = current[key] + (next[key] - current[key]) * 0.25;
  }
  return clampLoreMeters(result);
}

export function metersPass(
  meters: LoreMeters,
  min: Partial<LoreMeters>,
  max: Partial<LoreMeters>,
): boolean {
  for (const key of Object.keys(min) as LoreMeterKey[]) {
    const floor = min[key];
    if (typeof floor === "number" && meters[key] < floor) return false;
  }
  for (const key of Object.keys(max) as LoreMeterKey[]) {
    const ceiling = max[key];
    if (typeof ceiling === "number" && meters[key] > ceiling) return false;
  }
  return true;
}

export function meterShiftTags(prev: LoreMeters, next: LoreMeters): string[] {
  const tags: string[] = [];
  const deltas: Array<[LoreMeterKey, string]> = [
    ["heat", "heat_shift"],
    ["luck", "luck_shift"],
    ["rot", "rot_shift"],
    ["rep", "rep_shift"],
    ["vice", "vice_shift"],
    ["debt", "debt_shift"],
  ];
  for (const [key, tag] of deltas) {
    const delta = next[key] - prev[key];
    if (Math.abs(delta) >= 8) tags.push(tag);
    if (next[key] > 70) tags.push(`${key}_high`);
    if (next[key] < 25) tags.push(`${key}_low`);
  }
  return tags;
}

export function factsToStatTags(facts: CharacterFacts): string[] {
  return [
    "stat:level",
    "stat:rank",
    "stat:faction",
    "stat:company",
    "stat:property",
    "stat:networth",
    "stat:status",
  ];
}
