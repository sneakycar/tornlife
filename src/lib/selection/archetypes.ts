import type { NormalizedSummary } from "../db/types";

export interface ArchetypeResult {
  primary: string;
  secondary: string[];
  emerging: string[];
  scores: Record<string, number>;
  tags: string[];
}

const ARCHETYPE_RULES: Array<{
  name: string;
  tag: string;
  score: (summary: NormalizedSummary) => number;
}> = [
  {
    name: "THE GAMBLER",
    tag: "gambler",
    score: (s) => {
      const keys = s.comparisonKeys;
      const refills = Number(keys.refills ?? 0);
      return refills > 30 ? 60 + Math.min(refills, 40) : refills;
    },
  },
  {
    name: "THE DRUNK",
    tag: "drunk",
    score: (s) => {
      const alc = s.characterFacts.alcohol_used ?? Number(s.comparisonKeys.alcoholused ?? 0);
      return alc > 15 ? 40 + Math.min(alc, 50) : alc * 2;
    },
  },
  {
    name: "THE CRIMINAL",
    tag: "violent",
    score: (s) => {
      const crimes = s.characterFacts.crimes ?? Number(s.comparisonKeys.criminaloffenses ?? 0);
      const attacks = s.characterFacts.attacks_won ?? Number(s.comparisonKeys.attackswon ?? 0);
      return Math.min(100, crimes * 0.05 + attacks * 0.3);
    },
  },
  {
    name: "THE SAINT",
    tag: "religious",
    score: (s) => {
      const donations = s.characterFacts.donations ?? Number(s.comparisonKeys.donations ?? 0);
      return donations > 0 ? 35 + Math.min(donations * 2, 40) : 0;
    },
  },
  {
    name: "THE BUSINESSMAN",
    tag: "businessman",
    score: (s) => (s.characterFacts.company ? 55 : 0) + (s.characterFacts.net_worth ?? 0) > 20_000_000 ? 20 : 0,
  },
  {
    name: "THE WASHED UP",
    tag: "washed_up",
    score: (s) => {
      const hosp = s.characterFacts.hospitalizations ?? 0;
      const nw = s.characterFacts.net_worth ?? 0;
      return hosp > 3 && nw < 5_000_000 ? 50 + hosp * 3 : 0;
    },
  },
  {
    name: "THE CAREFUL ONE",
    tag: "careful",
    score: (s) => {
      const crimes = s.characterFacts.crimes ?? 0;
      return crimes < 20 && s.characterFacts.status === "Okay" ? 45 : 10;
    },
  },
  {
    name: "THE RECKLESS",
    tag: "reckless",
    score: (s) => {
      const drugs = s.characterFacts.drugs ?? 0;
      const crimes = s.characterFacts.crimes ?? 0;
      return Math.min(90, drugs * 2 + crimes * 0.08);
    },
  },
];

export function computeArchetypes(summary: NormalizedSummary): ArchetypeResult {
  const scores: Record<string, number> = {};
  const tagScores: Record<string, number> = {};

  for (const rule of ARCHETYPE_RULES) {
    const value = Math.round(rule.score(summary));
    scores[rule.name] = value;
    tagScores[rule.tag] = Math.max(tagScores[rule.tag] ?? 0, value);
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const primary = ranked[0]?.[1] > 20 ? ranked[0][0] : "THE UNKNOWN";
  const secondary = ranked.slice(1, 3).filter(([, v]) => v > 25).map(([n]) => n);
  const emerging = ranked.filter(([, v]) => v > 30 && v < 55).map(([n]) => n);

  const tags = Object.entries(tagScores)
    .filter(([, v]) => v > 20)
    .map(([t]) => t);

  if (primary === "THE UNKNOWN") tags.push("lonely", "mundane");

  return { primary, secondary, emerging, scores, tags };
}

export function driftArchetypeScores(
  existing: Record<string, number>,
  next: Record<string, number>,
): Record<string, number> {
  const merged: Record<string, number> = { ...existing };
  for (const [name, value] of Object.entries(next)) {
    const prev = existing[name] ?? value;
    merged[name] = Math.round(prev + (value - prev) * 0.2);
  }
  return merged;
}
