import type { FileNoticedItem } from "../trends/file-noticed";
import type { TrendConfidence } from "../trends/types";
import type { BiographyTimeline } from "./types";

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
    tag: "employment",
    min: 1,
    line: "The company is becoming an alibi.",
    confidence: "high",
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
