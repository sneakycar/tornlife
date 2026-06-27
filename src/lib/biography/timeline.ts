import type { CharacterFacts } from "../db/types";
import type { ActivityCounters } from "../trends/types";
import type { ParsedTornEvent } from "../trends/event-parser";
import type { BiographyBeat, BiographyTimeline, BiographyWindow } from "./types";

function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(abs / 1_000)}K`;
  return `$${abs.toLocaleString()}`;
}

function narrativeFor(
  tag: string,
  count: number,
  window: string,
): string | undefined {
  if (count <= 0) return undefined;
  const maps: Record<string, (c: number) => string> = {
    alcohol_use: (c) =>
      c >= 50
        ? window === "this_month"
          ? "The month mostly happened through aluminum cans."
          : "Drinking stopped looking like a choice."
        : c > 1
          ? "Another round of bottles."
          : "Bought another bottle.",
    fights: (c) =>
      c >= 20
        ? "Combat became part of the furniture."
        : c > 2
          ? "Fights kept showing up on the schedule."
          : "Won another fight.",
    hospital: (c) =>
      c >= 5
        ? "The hospital has stopped feeling temporary."
        : "Hospital again.",
    crime: (c) =>
      c >= 10
        ? "Crime activity increased without much panic."
        : "Another crime on the record.",
    medical_item_use: () => "The medicine cabinet got lighter again.",
    drug_use: () => "Chemical shortcuts again.",
    money_loss: (c) =>
      c >= 10_000_000
        ? "Money keeps leaving in clean, expensive shapes."
        : "Spent too much money.",
    money_gain: () => "Money came in faster than it stayed.",
    travel: (c) =>
      c >= 3 ? "Kept leaving town." : "Flew again.",
    jail: () => "Another stretch behind bars.",
    gambling: () => "The casino saw him again.",
    employment: () => "Worked the shift. Pretended it counts.",
    faction: () => "Faction business as usual.",
  };
  const fn = maps[tag];
  return fn ? fn(count) : undefined;
}

function pushBeat(
  beats: BiographyBeat[],
  seen: Set<string>,
  id: string,
  reality: string,
  tags: string[],
  narrative?: string,
) {
  if (seen.has(id)) return;
  seen.add(id);
  beats.push({ id, reality, narrative, tags });
}

function beatsFromCounters(
  prefix: string,
  counters: ActivityCounters,
  windowKey: string,
  confidence: BiographyWindow["confidence"],
): BiographyBeat[] {
  const beats: BiographyBeat[] = [];
  const seen = new Set<string>();

  const alc = counters.alcoholused ?? 0;
  if (alc > 0) {
    const tag = "alcohol_use";
    pushBeat(
      beats,
      seen,
      `${prefix}-alc`,
      alc === 1 ? "1 alcohol item." : `${alc.toLocaleString()} alcohol items.`,
      [tag],
      narrativeFor(tag, alc, windowKey),
    );
  }

  const med =
    (counters.medicalitemsused ?? 0) +
    (counters.drugsused ?? 0) +
    (counters.xantaken ?? 0);
  if (med > 0) {
    pushBeat(
      beats,
      seen,
      `${prefix}-med`,
      med === 1 ? "1 medical or drug item." : `${med.toLocaleString()} medical/drug items.`,
      ["medical_item_use", "drug_use"],
      narrativeFor("medical_item_use", med, windowKey),
    );
  }

  const fights =
    (counters.attackswon ?? 0) +
    (counters.attackslost ?? 0) +
    (counters.attacksdraw ?? 0);
  if (fights > 0) {
    pushBeat(
      beats,
      seen,
      `${prefix}-fights`,
      fights === 1 ? "1 fight." : `${fights.toLocaleString()} fights.`,
      ["fights"],
      narrativeFor("fights", fights, windowKey),
    );
  }

  const hosp = counters.hospital ?? 0;
  if (hosp > 0) {
    pushBeat(
      beats,
      seen,
      `${prefix}-hosp`,
      hosp === 1 ? "1 hospital visit." : `${hosp.toLocaleString()} hospital visits.`,
      ["hospital"],
      narrativeFor("hospital", hosp, windowKey),
    );
  }

  const crimes =
    (counters.criminaloffenses ?? 0) +
    (counters.vandalism ?? 0) +
    (counters.theft ?? 0);
  if (crimes > 0) {
    pushBeat(
      beats,
      seen,
      `${prefix}-crime`,
      crimes === 1 ? "1 crime." : `${crimes.toLocaleString()} crimes.`,
      ["crime"],
      narrativeFor("crime", crimes, windowKey),
    );
  }

  const nw = counters.networth ?? 0;
  if (nw < 0) {
    pushBeat(
      beats,
      seen,
      `${prefix}-spent`,
      `${fmtMoney(nw)} net worth change.`,
      ["money_loss"],
      narrativeFor("money_loss", Math.abs(nw), windowKey),
    );
  } else if (nw > 0) {
    pushBeat(
      beats,
      seen,
      `${prefix}-gain`,
      `${fmtMoney(nw)} gained.`,
      ["money_gain"],
      narrativeFor("money_gain", nw, windowKey),
    );
  }

  const travel = counters.traveltimes ?? 0;
  if (travel > 0) {
    pushBeat(
      beats,
      seen,
      `${prefix}-travel`,
      travel === 1 ? "1 trip." : `${travel.toLocaleString()} trips.`,
      ["travel"],
      narrativeFor("travel", travel, windowKey),
    );
  }

  const jail = counters.jailed ?? 0;
  if (jail > 0) {
    pushBeat(
      beats,
      seen,
      `${prefix}-jail`,
      jail === 1 ? "1 jail stay." : `${jail.toLocaleString()} jail stays.`,
      ["jail"],
      narrativeFor("jail", jail, windowKey),
    );
  }

  const refills = (counters.refills ?? 0) + (counters.nerverefills ?? 0);
  if (refills > 0) {
    pushBeat(
      beats,
      seen,
      `${prefix}-gamble`,
      `${refills.toLocaleString()} refills.`,
      ["gambling"],
      narrativeFor("gambling", refills, windowKey),
    );
  }

  if (beats.length === 0 && confidence === "low") {
    return beats;
  }

  return beats;
}

function beatsFromEvents(
  prefix: string,
  events: ParsedTornEvent[],
  since: Date,
): BiographyBeat[] {
  const beats: BiographyBeat[] = [];
  const seen = new Set<string>();
  const recent = events.filter((e) => e.event_timestamp >= since);

  const fightCount = recent.filter((e) => e.parsed_tags.includes("fights")).length;
  if (fightCount > 0 && !seen.has(`${prefix}-ev-fights`)) {
    pushBeat(
      beats,
      seen,
      `${prefix}-ev-fights`,
      fightCount === 1 ? "1 fight logged." : `${fightCount} fights logged.`,
      ["fights"],
      narrativeFor("fights", fightCount, prefix),
    );
  }

  const hospCount = recent.filter((e) => e.parsed_category === "hospital").length;
  if (hospCount > 0) {
    pushBeat(
      beats,
      seen,
      `${prefix}-ev-hosp`,
      hospCount === 1 ? "Hospital again." : `${hospCount} hospital events.`,
      ["hospital"],
      narrativeFor("hospital", hospCount, prefix),
    );
  }

  const travelCount = recent.filter((e) => e.parsed_tags.includes("travel")).length;
  if (travelCount > 0) {
    pushBeat(
      beats,
      seen,
      `${prefix}-ev-travel`,
      travelCount === 1 ? "Flew once." : `Flew ${travelCount} times.`,
      ["travel"],
      narrativeFor("travel", travelCount, prefix),
    );
  }

  return beats;
}

function mergeBeats(a: BiographyBeat[], b: BiographyBeat[]): BiographyBeat[] {
  const ids = new Set(a.map((x) => x.id));
  return [...a, ...b.filter((x) => !ids.has(x.id))];
}

function contextualBeats(facts: CharacterFacts | null, prefix: string): BiographyBeat[] {
  if (!facts) return [];
  const beats: BiographyBeat[] = [];
  if (facts.company) {
    beats.push({
      id: `${prefix}-company`,
      reality: `Company active: ${facts.company}.`,
      narrative: "The company is still pretending to be respectable.",
      tags: ["employment"],
    });
  }
  if (facts.faction) {
    beats.push({
      id: `${prefix}-faction`,
      reality: `Faction active: ${facts.faction}.`,
      narrative: "Faction membership remains, but belonging still looks optional.",
      tags: ["faction"],
    });
  }
  return beats;
}

function windowBlock(
  key: BiographyWindow["key"],
  title: string,
  counters: ActivityCounters,
  events: ParsedTornEvent[],
  since: Date,
  facts: CharacterFacts | null,
  syncDeltaCount: number,
): BiographyWindow {
  let confidence: BiographyWindow["confidence"] = "low";
  if (Object.keys(counters).length > 0) confidence = "medium";
  if (syncDeltaCount >= 3) confidence = "high";

  let beats = beatsFromCounters(key, counters, key, confidence);
  beats = mergeBeats(beats, beatsFromEvents(key, events, since));

  if (key !== "today") {
    beats = mergeBeats(beats, contextualBeats(facts, key));
  }

  let unavailableNote: string | undefined;
  if (beats.length === 0) {
    unavailableNote =
      syncDeltaCount < 2
        ? "The file needs more visits to write this chapter."
        : "Nothing new recorded in this window yet.";
  }

  return { key, title, beats: beats.slice(0, 8), confidence, unavailableNote };
}

export function buildBiographyTimeline(input: {
  deltas24h: ActivityCounters;
  deltas7d: ActivityCounters;
  deltas30d: ActivityCounters;
  events: ParsedTornEvent[];
  facts: CharacterFacts | null;
  syncDeltaCount: number;
}): BiographyTimeline {
  const now = new Date();
  const since24h = new Date(now.getTime() - 86400000);
  const since7d = new Date(now.getTime() - 7 * 86400000);
  const since30d = new Date(now.getTime() - 30 * 86400000);

  const windows: BiographyWindow[] = [
    windowBlock(
      "today",
      "Today",
      input.deltas24h,
      input.events,
      since24h,
      input.facts,
      input.syncDeltaCount,
    ),
    windowBlock(
      "this_week",
      "This Week",
      input.deltas7d,
      input.events,
      since7d,
      input.facts,
      input.syncDeltaCount,
    ),
    windowBlock(
      "this_month",
      "This Month",
      input.deltas30d,
      input.events,
      since30d,
      input.facts,
      input.syncDeltaCount,
    ),
  ];

  const totalBeats = windows.reduce((n, w) => n + w.beats.length, 0);
  const monthActivity = windows.find((w) => w.key === "this_month")?.beats ?? [];

  return {
    windows,
    hasEnoughForPatterns: monthActivity.length >= 3 || totalBeats >= 5,
    totalBeats,
  };
}
