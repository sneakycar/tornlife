import type { ChangeSummary } from "../snapshot/compare";
import type { FactChange } from "../snapshot/fact-changes";
import type { EventFamily } from "./constants";
import { EVENT_FAMILY_FALLBACKS, FIELD_TO_EVENT } from "./constants";

export function detectPrimaryEvent(
  changes: ChangeSummary | null | undefined,
  factChanges: FactChange[] | undefined,
  mode: "sync" | "assessment" | "lock" | "ambient",
): EventFamily | string {
  if (mode === "assessment") return "assessment";
  if (mode === "lock") return "lock_batch";
  if (mode === "ambient") return "quiet_day";

  if (factChanges?.length) {
    const top = factChanges[0];
    const mapped = FIELD_TO_EVENT[top.field];
    if (mapped) return mapped;
  }

  if (changes?.changes.length) {
    const sorted = [...changes.changes].sort((a, b) => b.significance - a.significance);
    for (const change of sorted) {
      const mapped = FIELD_TO_EVENT[change.field];
      if (mapped) return mapped;
    }
  }

  if (changes?.hasMeaningfulChanges) return "quiet_day";
  return "no_meaningful_change";
}

export function eventFamilyChain(primary: string): string[] {
  const chain = [primary];
  const fallbacks = EVENT_FAMILY_FALLBACKS[primary] ?? [];
  for (const fb of fallbacks) {
    if (!chain.includes(fb)) chain.push(fb);
  }
  if (!chain.includes("ambient_life")) chain.push("ambient_life");
  if (!chain.includes("no_meaningful_change")) chain.push("no_meaningful_change");
  return chain;
}
