import type { ActivityCounters } from "../trends/types";
import type { LifeVariables, RollingWindows } from "./types";
import { LIFE_VARIABLE_KEYS } from "./types";

export const DEFAULT_LIFE_VARIABLES: LifeVariables = {
  chemical_routine: 0,
  social_isolation: 0,
  washed_up_potential: 0,
  vice_pressure: 0,
  discipline: 0,
  obsession: 0,
  durability: 0,
  professionalism: 0,
  drifter: 0,
  risk_tolerance: 0,
  luck_dependence: 0,
  financial_instability: 0,
  routine: 0,
  respectability: 0,
  business_instinct: 0,
  criminal_identity: 0,
  heat_accumulation: 0,
  desensitization: 0,
  paranoia: 0,
  confidence: 0,
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}

function bump(vars: LifeVariables, key: keyof LifeVariables, amount: number) {
  vars[key] = clamp(vars[key] + amount);
}

/** Repeated behavior matters — windows weighted heavier than single sync deltas. */
export function evolveVariables(
  current: LifeVariables,
  windows: RollingWindows,
  syncDelta: ActivityCounters,
): LifeVariables {
  const vars = { ...current };

  const alc30 = windows.days30.alcoholused ?? 0;
  const alc7 = windows.days7.alcoholused ?? 0;
  const alcDelta = syncDelta.alcoholused ?? 0;

  if (alc30 >= 100) bump(vars, "chemical_routine", 8);
  else if (alc30 >= 30) bump(vars, "chemical_routine", 4);
  else if (alc7 >= 10) bump(vars, "chemical_routine", 2);
  if (alcDelta > 0) bump(vars, "chemical_routine", Math.min(3, alcDelta * 0.01));
  if (alc30 >= 50) {
    bump(vars, "vice_pressure", 5);
    bump(vars, "social_isolation", 2);
    bump(vars, "washed_up_potential", 3);
  }

  const med30 =
    (windows.days30.medicalitemsused ?? 0) +
    (windows.days30.drugsused ?? 0) +
    (windows.days30.xantaken ?? 0);
  if (med30 >= 20) bump(vars, "chemical_routine", 4);

  const fights30 =
    (windows.days30.attackswon ?? 0) +
    (windows.days30.attackslost ?? 0);
  const fights7 = (windows.days7.attackswon ?? 0) + (windows.days7.attackslost ?? 0);
  if (fights30 >= 30) {
    bump(vars, "durability", 6);
    bump(vars, "confidence", 4);
    bump(vars, "heat_accumulation", 5);
    bump(vars, "desensitization", 4);
    bump(vars, "paranoia", 3);
  } else if (fights7 >= 5) {
    bump(vars, "heat_accumulation", 2);
    bump(vars, "confidence", 1);
  }

  const hosp30 = windows.days30.hospital ?? 0;
  const hosp7 = windows.days7.hospital ?? 0;
  if (hosp30 >= 10) bump(vars, "washed_up_potential", 8);
  else if (hosp7 >= 3) bump(vars, "washed_up_potential", 3);

  const crimes30 =
    (windows.days30.criminaloffenses ?? 0) +
    (windows.days30.vandalism ?? 0) +
    (windows.days30.theft ?? 0);
  if (crimes30 >= 20) {
    bump(vars, "criminal_identity", 8);
    bump(vars, "heat_accumulation", 6);
    bump(vars, "desensitization", 5);
  } else if (crimes30 >= 5) bump(vars, "criminal_identity", 3);

  const travel30 = windows.days30.traveltimes ?? 0;
  if (travel30 >= 5) {
    bump(vars, "drifter", 7);
    bump(vars, "paranoia", 2);
  } else if (travel30 >= 2) bump(vars, "drifter", 3);

  const gamble30 = (windows.days30.refills ?? 0) + (windows.days30.nerverefills ?? 0);
  if (gamble30 >= 15) {
    bump(vars, "risk_tolerance", 7);
    bump(vars, "luck_dependence", 8);
    bump(vars, "financial_instability", 6);
  } else if (gamble30 >= 5) bump(vars, "risk_tolerance", 3);

  const nw30 = windows.days30.networth ?? 0;
  if (nw30 < -5_000_000) bump(vars, "financial_instability", 8);
  else if (nw30 < -500_000) bump(vars, "financial_instability", 4);

  const purchases30 = windows.days30.itemsbought ?? 0;
  if (purchases30 >= 50 && nw30 < 0) bump(vars, "financial_instability", 3);

  if (windows.lifetime.donations && (windows.lifetime.donations ?? 0) > 5) {
    bump(vars, "respectability", 2);
  }

  // Slow decay toward baseline — habits fade without reinforcement
  for (const key of LIFE_VARIABLE_KEYS) {
    const v = vars[key];
    if (v > 50) vars[key] = clamp(v - 0.3);
    else if (v > 20) vars[key] = clamp(v - 0.15);
  }

  return vars;
}

export function variablesToWritingTags(vars: LifeVariables): string[] {
  const tags: string[] = [];
  if (vars.chemical_routine >= 40) tags.push("chemical_routine", "morning_damage", "hangover_tone");
  if (vars.vice_pressure >= 50) tags.push("vice_high", "alcohol_use");
  if (vars.heat_accumulation >= 45) tags.push("heat", "fights", "paranoia");
  if (vars.financial_instability >= 45) tags.push("money_loss", "money_pressure");
  if (vars.criminal_identity >= 40) tags.push("crime", "criminal_identity");
  if (vars.drifter >= 40) tags.push("travel", "drifter");
  if (vars.risk_tolerance >= 45) tags.push("gambler", "risk");
  if (vars.respectability >= 35) tags.push("employment", "respectability");
  if (vars.routine >= 40) tags.push("routine", "mundane");
  if (vars.washed_up_potential >= 45) tags.push("hospital", "injury", "washed_up");
  if (vars.desensitization >= 40) tags.push("desensitized", "violence_normalized");
  if (vars.confidence >= 45) tags.push("confidence", "heat");
  return [...new Set(tags)];
}
