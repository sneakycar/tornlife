import type { CharacterFacts, InterpretedChange } from "../db/types";
import type { ActivityCounters, TrendConfidence, TrendFact } from "./types";

export interface FileNoticedItem {
  id: string;
  line: string;
  evidence: string[];
  confidence: TrendConfidence;
}

function windowLabel(window: string): string {
  if (window === "7_days") return "last 7 days";
  if (window === "24_hours") return "last 24 hours";
  if (window === "lifetime") return "lifetime record";
  return window.replace(/_/g, " ");
}

function alcoholLine(fact: TrendFact, deltas7d: ActivityCounters): string | null {
  const recent = deltas7d.alcoholused ?? 0;
  if (fact.trend === "extreme" || (fact.count >= 50 && fact.window !== "lifetime")) {
    return "Drinking is no longer background noise.";
  }
  if ((fact.trend === "increasing" && recent >= 8) || recent >= 15) {
    return "Drinking pattern increased recently.";
  }
  return null;
}

function moneyLine(fact: TrendFact, deltas7d: ActivityCounters): string | null {
  const nw = deltas7d.networth;
  const cash = deltas7d.moneyonhand;
  if (nw != null && nw < 0) {
    return "Money is leaving faster than usual.";
  }
  if (cash != null && cash < 0) {
    return "Cash moved like it was trying to get away.";
  }
  if (fact.trend === "decreasing") {
    return "Net worth slipped since the last read.";
  }
  return null;
}

function hospitalLine(fact: TrendFact): string | null {
  if (fact.count >= 5 || fact.trend === "increasing") {
    return "Hospital time has become too familiar.";
  }
  return null;
}

function fightLine(fact: TrendFact): string | null {
  if (fact.count >= 8 || fact.trend === "increasing") {
    return "Fights are becoming routine.";
  }
  return null;
}

function crimeLine(fact: TrendFact, deltas7d: ActivityCounters): string | null {
  const recent =
    (deltas7d.criminaloffenses ?? 0) +
    (deltas7d.vandalism ?? 0) +
    (deltas7d.theft ?? 0);
  if (recent >= 5 || (fact.trend === "increasing" && fact.count >= 8)) {
    return "Crimes are accumulating with less visible panic.";
  }
  return null;
}

function drugLine(fact: TrendFact, deltas7d: ActivityCounters): string | null {
  const recent =
    (deltas7d.drugsused ?? 0) +
    (deltas7d.medicalitemsused ?? 0) +
    (deltas7d.xantaken ?? 0);
  if (recent >= 5 || (fact.trend === "increasing" && fact.count >= 10)) {
    return "Medical and chemical use is climbing on the record.";
  }
  return null;
}

function factEvidence(fact: TrendFact): string[] {
  const bullets: string[] = [];
  const label = windowLabel(fact.window);
  if (fact.activity === "alcohol_use") {
    bullets.push(`Alcohol-related activity in ${label}.`);
    if (fact.count > 0 && fact.window !== "lifetime") {
      bullets.push(`${fact.count.toLocaleString()} units recorded (${fact.source}).`);
    } else if (fact.count > 0) {
      bullets.push(`Lifetime alcohol counter: ${fact.count.toLocaleString()}.`);
    }
  } else if (fact.activity === "fights") {
    bullets.push(`${fact.count} fight-related events in ${label}.`);
  } else if (fact.activity === "hospital") {
    bullets.push(`${fact.count} hospital events in ${label}.`);
  } else if (fact.activity.includes("money")) {
    bullets.push(`Money movement detected in ${label} (${fact.item ?? fact.activity}).`);
    if (fact.count) bullets.push(`Delta: ${fact.count.toLocaleString()}.`);
  } else if (fact.activity.includes("crime") || fact.activity === "crime") {
    bullets.push(`Crime counters moved in ${label}.`);
    if (fact.count) bullets.push(`Count: ${fact.count.toLocaleString()}.`);
  } else if (fact.activity.includes("drug") || fact.activity.includes("medical")) {
    bullets.push(`Medical/drug counters changed in ${label}.`);
  } else {
    bullets.push(`${fact.activity} — ${fact.count} in ${label} (${fact.source}).`);
  }
  if (fact.note) bullets.push(fact.note);
  bullets.push(`Confidence: ${fact.confidence}.`);
  return bullets;
}

function changeToLine(change: InterpretedChange): string | null {
  const text = change.interpretation?.trim();
  if (!text) return null;
  if (text.length > 120) return `${text.slice(0, 117)}…`;
  return text.endsWith(".") ? text : `${text}.`;
}

function contextualLines(_facts: CharacterFacts | null | undefined): FileNoticedItem[] {
  return [];
}

export function buildFileNoticed(input: {
  trendFacts: TrendFact[];
  interpretationChanges?: InterpretedChange[];
  facts?: CharacterFacts | null;
  recentDeltas7d: ActivityCounters;
  recentDeltasMonth: ActivityCounters;
}): FileNoticedItem[] {
  const items: FileNoticedItem[] = [];
  const seen = new Set<string>();

  const push = (item: FileNoticedItem) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    items.push(item);
  };

  for (const fact of input.trendFacts) {
    if (fact.confidence === "unavailable") continue;

    let line: string | null = null;
    if (fact.activity === "alcohol_use") {
      line = alcoholLine(fact, input.recentDeltas7d);
    } else if (fact.activity === "fights") {
      line = fightLine(fact);
    } else if (fact.activity === "hospital") {
      line = hospitalLine(fact);
    } else if (fact.activity.includes("money")) {
      line = moneyLine(fact, input.recentDeltas7d);
    } else if (fact.activity.includes("crime") || fact.activity === "crime") {
      line = crimeLine(fact, input.recentDeltas7d);
    } else if (
      fact.activity.includes("drug") ||
      fact.activity.includes("medical")
    ) {
      line = drugLine(fact, input.recentDeltas7d);
    }

    if (!line) continue;

    push({
      id: `${fact.window}-${fact.activity}`,
      line,
      evidence: factEvidence(fact),
      confidence: fact.confidence,
    });
  }

  for (const change of input.interpretationChanges ?? []) {
    const line = changeToLine(change);
    if (!line) continue;
    push({
      id: `change-${change.field}`,
      line,
      evidence: change.fact_line ? [change.fact_line] : [],
      confidence:
        change.confidence >= 0.8
          ? "high"
          : change.confidence >= 0.5
            ? "medium"
            : "low",
    });
  }

  for (const ctx of contextualLines(input.facts)) {
    push(ctx);
  }

  return items.slice(0, 8);
}
