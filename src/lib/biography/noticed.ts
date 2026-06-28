import type { FileNoticedItem } from "../trends/file-noticed";
import type { TrendConfidence } from "../trends/types";
import type { LifeEngineSnapshot } from "../life-engine";
import type { BiographyTimeline } from "./types";

const THREAD_NOTICED: Record<string, string> = {
  alcohol_spiral: "Drinking stopped looking like recreation. It started looking like maintenance.",
  hospital_routine: "Hospital time is no longer an emergency — it is a recurring appointment.",
  crime_spree: "Crime is no longer a decision point. It is just another afternoon.",
  money_problems: "Money keeps leaving faster than the life it is supposed to fund.",
  gambling_streak: "Luck has become a habit he keeps paying to test.",
  travel_lifestyle: "He keeps leaving town like distance might reorganize the mess.",
  combat_routine: "Violence has stopped feeling like an event. It feels like weather.",
  chemical_reliance: "The medicine cabinet is emptying faster than the excuses.",
  career_stability: "The respectable job is still the cover story that works.",
};

function tagCounts(timeline: BiographyTimeline): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const win of timeline.windows) {
    for (const beat of win.beats) {
      for (const tag of beat.tags) {
        counts[tag] = (counts[tag] ?? 0) + 1;
      }
    }
  }
  return counts;
}

const PATTERN_LINES: Array<{
  tag: string;
  min: number;
  line: string;
  confidence: TrendConfidence;
}> = [
  {
    tag: "alcohol_use",
    min: 2,
    line: "Drinking is no longer background noise.",
    confidence: "medium",
  },
  {
    tag: "hospital",
    min: 2,
    line: "Hospital time has become too familiar.",
    confidence: "medium",
  },
  {
    tag: "fights",
    min: 2,
    line: "Fights are becoming routine.",
    confidence: "medium",
  },
  {
    tag: "crime",
    min: 2,
    line: "Crimes are accumulating with less visible panic.",
    confidence: "medium",
  },
  {
    tag: "money_loss",
    min: 1,
    line: "Money is leaving faster than it changes his life.",
    confidence: "low",
  },
  {
    tag: "medical_item_use",
    min: 2,
    line: "Medical supplies are leaving faster than excuses.",
    confidence: "medium",
  },
  {
    tag: "gambling",
    min: 2,
    line: "Risk is starting to feel like a schedule.",
    confidence: "medium",
  },
];

export function buildFileNoticedFromLifeEngine(
  lifeEngine: LifeEngineSnapshot | null,
): FileNoticedItem[] {
  if (!lifeEngine) return [];

  const items: FileNoticedItem[] = [];
  for (const thread of lifeEngine.threads) {
    if (thread.status !== "active") continue;
    const line = THREAD_NOTICED[thread.thread_key];
    if (!line) continue;
    items.push({
      id: `thread-${thread.thread_key}`,
      line,
      evidence: [`Sustained pattern: ${thread.label}.`],
      confidence: thread.intensity >= 50 ? "high" : "medium",
    });
  }

  for (const [i, callback] of lifeEngine.callbacks.entries()) {
    items.push({
      id: `callback-${i}`,
      line: callback,
      evidence: ["Continuity from earlier file notes."],
      confidence: "medium",
    });
  }

  return items.slice(0, 6);
}

/** Pattern observations derived from accumulated biography beats — not raw stats alone. */
export function buildFileNoticedFromTimeline(
  timeline: BiographyTimeline,
): FileNoticedItem[] {
  if (!timeline.hasEnoughForPatterns) return [];

  const counts = tagCounts(timeline);
  const items: FileNoticedItem[] = [];

  for (const pattern of PATTERN_LINES) {
    const c = counts[pattern.tag] ?? 0;
    if (c < pattern.min) continue;
    items.push({
      id: `pattern-${pattern.tag}`,
      line: pattern.line,
      evidence: [
        `Observed across biography windows (${c} beat${c === 1 ? "" : "s"} tagged ${pattern.tag}).`,
      ],
      confidence: pattern.confidence,
    });
  }

  return items.slice(0, 6);
}
