import type { LifeVariables, RollingWindows, StoryThread } from "./types";

interface ThreadRule {
  key: string;
  label: string;
  tags: string[];
  detect: (w: RollingWindows, v: LifeVariables) => { active: boolean; intensity: number; evidence: Record<string, unknown> };
  fade: (w: RollingWindows, v: LifeVariables) => boolean;
}

const THREAD_RULES: ThreadRule[] = [
  {
    key: "alcohol_spiral",
    label: "Alcohol spiral",
    tags: ["alcohol_use", "vice"],
    detect: (w, v) => {
      const c = w.days30.alcoholused ?? 0;
      const active = c >= 15 || v.chemical_routine >= 35;
      return {
        active,
        intensity: Math.min(100, c * 2 + v.chemical_routine * 0.5),
        evidence: { alcohol_30d: c, chemical_routine: v.chemical_routine },
      };
    },
    fade: (w) => (w.days7.alcoholused ?? 0) < 2,
  },
  {
    key: "hospital_routine",
    label: "Hospital routine",
    tags: ["hospital", "injury"],
    detect: (w, v) => {
      const c = w.days30.hospital ?? 0;
      const active = c >= 4 || v.washed_up_potential >= 30;
      return { active, intensity: c * 12 + v.washed_up_potential * 0.4, evidence: { hospital_30d: c } };
    },
    fade: (w) => (w.days30.hospital ?? 0) < 1,
  },
  {
    key: "crime_spree",
    label: "Crime spree",
    tags: ["crime", "heat"],
    detect: (w, v) => {
      const c =
        (w.days30.criminaloffenses ?? 0) +
        (w.days30.vandalism ?? 0) +
        (w.days30.theft ?? 0);
      const active = c >= 8 || v.criminal_identity >= 30;
      return { active, intensity: c * 5 + v.criminal_identity * 0.5, evidence: { crimes_30d: c } };
    },
    fade: (w) => {
      const c = (w.days7.criminaloffenses ?? 0) + (w.days7.vandalism ?? 0);
      return c < 1;
    },
  },
  {
    key: "money_problems",
    label: "Money problems",
    tags: ["money_loss", "money_pressure"],
    detect: (w, v) => {
      const nw = w.days30.networth ?? 0;
      const active = nw < -1_000_000 || v.financial_instability >= 35;
      return {
        active,
        intensity: Math.min(100, Math.abs(nw) / 100_000 + v.financial_instability),
        evidence: { networth_delta_30d: nw },
      };
    },
    fade: (w, v) => (w.days7.networth ?? 0) >= 0 && v.financial_instability < 25,
  },
  {
    key: "gambling_streak",
    label: "Gambling streak",
    tags: ["gambler", "risk"],
    detect: (w, v) => {
      const c = (w.days30.refills ?? 0) + (w.days30.nerverefills ?? 0);
      const active = c >= 8 || v.luck_dependence >= 35;
      return { active, intensity: c * 6 + v.luck_dependence * 0.5, evidence: { refills_30d: c } };
    },
    fade: (w) => (w.days7.refills ?? 0) + (w.days7.nerverefills ?? 0) < 2,
  },
  {
    key: "travel_lifestyle",
    label: "Travel lifestyle",
    tags: ["travel", "drifter"],
    detect: (w, v) => {
      const c = w.days30.traveltimes ?? 0;
      const active = c >= 3 || v.drifter >= 30;
      return { active, intensity: c * 15 + v.drifter * 0.5, evidence: { trips_30d: c } };
    },
    fade: (w) => (w.days30.traveltimes ?? 0) < 1,
  },
  {
    key: "career_stability",
    label: "Career stability",
    tags: ["employment", "respectability"],
    detect: (_w, v) => ({
      active: v.routine >= 25 && v.respectability >= 25,
      intensity: (v.routine + v.respectability) / 2,
      evidence: { routine: v.routine, respectability: v.respectability },
    }),
    fade: (_w, v) => v.routine < 15,
  },
  {
    key: "combat_routine",
    label: "Combat routine",
    tags: ["fights", "heat"],
    detect: (w, v) => {
      const c = (w.days30.attackswon ?? 0) + (w.days30.attackslost ?? 0);
      const active = c >= 10 || v.heat_accumulation >= 30;
      return { active, intensity: c * 4 + v.heat_accumulation * 0.5, evidence: { fights_30d: c } };
    },
    fade: (w) => (w.days7.attackswon ?? 0) + (w.days7.attackslost ?? 0) < 2,
  },
  {
    key: "chemical_reliance",
    label: "Chemical reliance",
    tags: ["drug_use", "medical_item_use"],
    detect: (w, v) => {
      const c =
        (w.days30.medicalitemsused ?? 0) +
        (w.days30.drugsused ?? 0) +
        (w.days30.xantaken ?? 0);
      const active = c >= 10 || v.chemical_routine >= 40;
      return { active, intensity: c * 5 + v.chemical_routine * 0.4, evidence: { medical_30d: c } };
    },
    fade: (w) => {
      const c =
        (w.days7.medicalitemsused ?? 0) +
        (w.days7.drugsused ?? 0);
      return c < 1;
    },
  },
];

export function detectThreads(
  windows: RollingWindows,
  variables: LifeVariables,
  existing: StoryThread[],
): Array<Omit<StoryThread, "id"> & { thread_key: string }> {
  const now = new Date().toISOString();
  const results: Array<Omit<StoryThread, "id"> & { thread_key: string }> = [];

  for (const rule of THREAD_RULES) {
    const { active, intensity, evidence } = rule.detect(windows, variables);
    const prev = existing.find((t) => t.thread_key === rule.key);
    const shouldFade = prev && rule.fade(windows, variables);

    if (!active && !prev) continue;

    let status: StoryThread["status"] = "active";
    if (!active || shouldFade) status = prev?.status === "active" ? "fading" : "dormant";
    if (active && !shouldFade) status = "active";

    if (!active && status === "dormant") continue;

    results.push({
      thread_key: rule.key,
      label: rule.label,
      status,
      intensity: Math.min(100, Math.round(intensity)),
      started_at: prev?.started_at ?? now,
      last_reinforced_at: active ? now : prev?.last_reinforced_at ?? now,
      evidence: { ...evidence, tags: rule.tags },
    });
  }

  return results;
}

export function threadWritingTags(threads: StoryThread[]): string[] {
  const tags: string[] = [];
  for (const t of threads) {
    if (t.status !== "active") continue;
    tags.push(`thread:${t.thread_key}`);
    const ev = t.evidence as { tags?: string[] };
    if (ev.tags) tags.push(...ev.tags);
  }
  return [...new Set(tags)];
}
