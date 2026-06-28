import type { CharacterFacts } from "../db/types";
import type { LifeEngineSnapshot } from "../life-engine";
import type { ActivityCounters } from "../trends/types";
import type { BiographyBeat, BiographyTimeline, BiographyWindow } from "./types";
import {
  crimeTotal,
  fightTotal,
  gambleTotal,
  medicalTotal,
  meetsThreshold,
} from "./thresholds";

function patternLine(
  theme: string,
  count: number,
  window: BiographyWindow["key"],
): { narrative: string; reality: string } | null {
  const w = window === "today" ? "today" : window === "this_week" ? "this week" : "this month";

  if (theme === "alcohol") {
    return {
      narrative:
        count >= 50
          ? "The month mostly happened through aluminum and bad decisions."
          : count >= 15
            ? "Drinking is no longer background noise in this life."
            : "Another stretch where the bottles kept winning.",
      reality: `Repeated alcohol use across ${w} (${count} recorded).`,
    };
  }
  if (theme === "fights") {
    return {
      narrative:
        count >= 20
          ? "Combat became part of the furniture."
          : "Fights kept appearing like they were scheduled.",
      reality: `Sustained fight activity across ${w} (${count} recorded).`,
    };
  }
  if (theme === "hospital") {
    return {
      narrative:
        count >= 5
          ? "The hospital has stopped feeling temporary."
          : "He keeps waking up under fluorescent lights.",
      reality: `Hospital pattern across ${w} (${count} visits).`,
    };
  }
  if (theme === "crime") {
    return {
      narrative:
        count >= 15
          ? "Crimes are accumulating with less visible panic."
          : "The criminal record keeps thickening without drama.",
      reality: `Crime pattern across ${w} (${count} offenses).`,
    };
  }
  if (theme === "medical") {
    return {
      narrative: "The medicine cabinet got lighter again.",
      reality: `Medical/chemical use pattern across ${w} (${count} recorded).`,
    };
  }
  if (theme === "money") {
    return {
      narrative: "Money keeps leaving in clean, stupid shapes.",
      reality: `Significant net worth movement across ${w}.`,
    };
  }
  if (theme === "travel") {
    return {
      narrative: count >= 3 ? "He keeps leaving town." : "Travel keeps interrupting the routine.",
      reality: `Travel pattern across ${w} (${count} trips).`,
    };
  }
  if (theme === "gambling") {
    return {
      narrative: "The casino keeps seeing him like it knows his name.",
      reality: `Gambling activity across ${w} (${count} refills).`,
    };
  }
  return null;
}

function beatsForWindow(
  key: BiographyWindow["key"],
  counters: ActivityCounters,
): BiographyBeat[] {
  const beats: BiographyBeat[] = [];
  const seen = new Set<string>();

  const add = (id: string, narrative: string, reality: string, tags: string[]) => {
    if (seen.has(id)) return;
    seen.add(id);
    beats.push({ id, narrative, reality, tags });
  };

  const alc = counters.alcoholused ?? 0;
  if (meetsThreshold("alcoholused", alc, key)) {
    const p = patternLine("alcohol", alc, key);
    if (p) add(`${key}-alc`, p.narrative, p.reality, ["alcohol_use"]);
  }

  const fights = fightTotal(counters);
  if (meetsThreshold("attackswon", fights, key)) {
    const p = patternLine("fights", fights, key);
    if (p) add(`${key}-fights`, p.narrative, p.reality, ["fights"]);
  }

  const hosp = counters.hospital ?? 0;
  if (meetsThreshold("hospital", hosp, key)) {
    const p = patternLine("hospital", hosp, key);
    if (p) add(`${key}-hosp`, p.narrative, p.reality, ["hospital"]);
  }

  const crimes = crimeTotal(counters);
  if (meetsThreshold("criminaloffenses", crimes, key)) {
    const p = patternLine("crime", crimes, key);
    if (p) add(`${key}-crime`, p.narrative, p.reality, ["crime"]);
  }

  const med = medicalTotal(counters);
  if (meetsThreshold("medicalitemsused", med, key)) {
    const p = patternLine("medical", med, key);
    if (p) add(`${key}-med`, p.narrative, p.reality, ["medical_item_use"]);
  }

  const nw = counters.networth ?? 0;
  if (nw < -500_000 && key !== "today") {
    const p = patternLine("money", Math.abs(nw), key);
    if (p) add(`${key}-money`, p.narrative, p.reality, ["money_loss"]);
  }

  const travel = counters.traveltimes ?? 0;
  if (meetsThreshold("traveltimes", travel, key)) {
    const p = patternLine("travel", travel, key);
    if (p) add(`${key}-travel`, p.narrative, p.reality, ["travel"]);
  }

  const gamble = gambleTotal(counters);
  if (meetsThreshold("refills", gamble, key)) {
    const p = patternLine("gambling", gamble, key);
    if (p) add(`${key}-gamble`, p.narrative, p.reality, ["gambling"]);
  }

  return beats.slice(0, 5);
}

function windowBlock(
  key: BiographyWindow["key"],
  title: string,
  counters: ActivityCounters,
  lifeEngine: LifeEngineSnapshot | null,
  syncDeltaCount: number,
): BiographyWindow {
  const beats = beatsForWindow(key, counters);

  let confidence: BiographyWindow["confidence"] = "low";
  if (beats.length > 0) confidence = "medium";
  if (lifeEngine?.threads.some((t) => t.status === "active")) {
    confidence = "high";
  }

  let unavailableNote: string | undefined;
  if (beats.length === 0) {
    unavailableNote =
      syncDeltaCount < 3
        ? "The file is still learning this life. Patterns need time, not snapshots."
        : key === "today"
          ? "Quiet day. Nothing worth a chapter yet."
          : "No sustained pattern in this window yet.";
  }

  return { key, title, beats, confidence, unavailableNote };
}

export function buildBiographyTimeline(input: {
  deltas24h: ActivityCounters;
  deltas7d: ActivityCounters;
  deltas30d: ActivityCounters;
  lifeEngine: LifeEngineSnapshot | null;
  syncDeltaCount: number;
  _facts?: CharacterFacts | null;
}): BiographyTimeline {
  const windows: BiographyWindow[] = [
    windowBlock("today", "Today", input.deltas24h, input.lifeEngine, input.syncDeltaCount),
    windowBlock("this_week", "This Week", input.deltas7d, input.lifeEngine, input.syncDeltaCount),
    windowBlock("this_month", "This Month", input.deltas30d, input.lifeEngine, input.syncDeltaCount),
  ];

  const totalBeats = windows.reduce((n, w) => n + w.beats.length, 0);
  const activeThreads = input.lifeEngine?.threads.filter((t) => t.status === "active").length ?? 0;

  return {
    windows,
    hasEnoughForPatterns: activeThreads >= 1 || totalBeats >= 2,
    totalBeats,
  };
}
