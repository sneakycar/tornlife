import type { BiographyWindowKey } from "./types";

/** Minimum activity before the file writes a line — one-offs mean nothing. */
export const PATTERN_THRESHOLDS: Record<
  string,
  Record<BiographyWindowKey, number>
> = {
  alcoholused: { today: 3, this_week: 8, this_month: 20 },
  medicalitemsused: { today: 2, this_week: 5, this_month: 12 },
  drugsused: { today: 2, this_week: 5, this_month: 12 },
  xantaken: { today: 2, this_week: 5, this_month: 12 },
  attackswon: { today: 2, this_week: 6, this_month: 15 },
  attackslost: { today: 2, this_week: 6, this_month: 15 },
  attacksdraw: { today: 2, this_week: 6, this_month: 15 },
  hospital: { today: 2, this_week: 3, this_month: 6 },
  criminaloffenses: { today: 3, this_week: 8, this_month: 20 },
  vandalism: { today: 3, this_week: 8, this_month: 20 },
  theft: { today: 3, this_week: 8, this_month: 20 },
  traveltimes: { today: 2, this_week: 3, this_month: 5 },
  refills: { today: 3, this_week: 8, this_month: 15 },
  nerverefills: { today: 3, this_week: 8, this_month: 15 },
  jailed: { today: 1, this_week: 2, this_month: 3 },
};

export function meetsThreshold(
  key: string,
  count: number,
  window: BiographyWindowKey,
): boolean {
  const t = PATTERN_THRESHOLDS[key]?.[window];
  if (t == null) return count >= (window === "today" ? 5 : 10);
  return count >= t;
}

export function fightTotal(c: Record<string, number>): number {
  return (c.attackswon ?? 0) + (c.attackslost ?? 0) + (c.attacksdraw ?? 0);
}

export function medicalTotal(c: Record<string, number>): number {
  return (c.medicalitemsused ?? 0) + (c.drugsused ?? 0) + (c.xantaken ?? 0);
}

export function crimeTotal(c: Record<string, number>): number {
  return (c.criminaloffenses ?? 0) + (c.vandalism ?? 0) + (c.theft ?? 0);
}

export function gambleTotal(c: Record<string, number>): number {
  return (c.refills ?? 0) + (c.nerverefills ?? 0);
}
