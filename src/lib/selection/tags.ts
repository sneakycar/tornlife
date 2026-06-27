import type { NormalizedSummary } from "../db/types";
import type { ChangeSummary } from "../snapshot/compare";
import type { FactChange } from "../snapshot/fact-changes";
import { FIELD_TO_EVENT } from "./constants";

function unique(tags: string[]): string[] {
  return [...new Set(tags.filter(Boolean))];
}

export function classifyPlayerTags(
  summary: NormalizedSummary,
  changes?: ChangeSummary | null,
  factChanges?: FactChange[],
): string[] {
  const tags: string[] = [];
  const facts = summary.characterFacts;
  const keys = summary.comparisonKeys;

  if (facts.status === "Hospital") tags.push("hospital", "injury", "vulnerability");
  if (facts.status === "Jail") tags.push("jail", "heat", "risk");
  if (facts.status === "Traveling" || facts.status === "Abroad") {
    tags.push("travel");
  }
  if (facts.faction) tags.push("faction");
  if (facts.company) tags.push("company_work", "professional");
  if (facts.education) tags.push("education");
  if ((facts.crimes ?? 0) > 100) tags.push("crime", "heat");
  if ((facts.hospitalizations ?? 0) > 5) tags.push("hospital", "injury");
  if ((facts.drugs ?? 0) > 10) tags.push("vice", "drug_use");
  if ((facts.alcohol_used ?? 0) > 20) tags.push("vice", "drunk");
  if ((facts.donations ?? 0) > 0) tags.push("church", "charity", "religious_gesture");
  if ((facts.attacks_won ?? 0) > 50) tags.push("violent", "heat");
  if ((facts.travel_times ?? 0) > 20) tags.push("travel");

  const netWorth = facts.net_worth ?? Number(keys.networth ?? 0);
  if (netWorth > 50_000_000) tags.push("rich", "wealth", "money");
  else if (netWorth < 1_000_000) tags.push("broke", "debt", "money");
  else tags.push("money");

  const cash = facts.money_on_hand ?? Number(keys.moneyonhand ?? 0);
  if (cash > 5_000_000) tags.push("cash", "confidence");

  for (const signal of summary.activitySignals) {
    const s = signal.signal.toLowerCase();
    if (s.includes("fight") || s.includes("won")) tags.push("violent", "heat");
    if (s.includes("hospital")) tags.push("hospital", "injury");
    if (s.includes("jail")) tags.push("jail", "heat");
    if (s.includes("travel")) tags.push("travel");
    if (s.includes("offense") || s.includes("steal") || s.includes("scam")) {
      tags.push("crime", "heat", "vice");
    }
    if (s.includes("drug") || s.includes("alcohol") || s.includes("drank")) {
      tags.push("vice");
    }
    if (s.includes("donat")) tags.push("church", "charity");
    if (s.includes("faction")) tags.push("faction");
    if (s.includes("work") || s.includes("company")) tags.push("company_work");
  }

  if (changes?.hasMeaningfulChanges) {
    for (const change of changes.changes) {
      const eventTag = FIELD_TO_EVENT[change.field];
      if (eventTag) tags.push(eventTag.replace(/_/g, " "), eventTag);
      tags.push(change.field);
    }
  }

  if (factChanges?.length) {
    for (const fc of factChanges) {
      const eventTag = FIELD_TO_EVENT[fc.field];
      if (eventTag) tags.push(eventTag);
      if (fc.field === "networth") {
        tags.push(fc.fact_line.includes("Increased") ? "money_gain" : "money_loss");
      }
      if (fc.field === "donations") tags.push("church", "charity");
      if (fc.field === "drugs") tags.push("vice", "drug_use");
      if (fc.field === "hospital") tags.push("hospital", "injury");
      if (fc.field === "jailed") tags.push("jail", "heat");
      if (fc.field === "criminaloffenses") tags.push("crime", "heat");
    }
  }

  if (!changes?.hasMeaningfulChanges) {
    tags.push("quiet_day", "no_meaningful_change", "mundane");
  }

  return unique(tags);
}

export function mergeTagSets(...sets: string[][]): string[] {
  return unique(sets.flat());
}

export function tagsContainAll(haystack: string[], needles: string[]): boolean {
  if (!needles.length) return true;
  const set = new Set(haystack);
  return needles.every((t) => set.has(t));
}

export function tagsOverlap(a: string[], b: string[]): boolean {
  if (!a.length || !b.length) return false;
  const set = new Set(b);
  return a.some((t) => set.has(t));
}
