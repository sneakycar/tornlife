import type { PageEvidence } from "../ui/page-evidence";
import type { BiographyTimeline } from "./types";

/** Pattern-level receipts only — never a raw event log dump. */
export function buildEvidenceFromTimeline(
  timeline: BiographyTimeline,
  confidence: PageEvidence["confidence"],
): PageEvidence {
  const bullets: string[] = [];

  for (const window of timeline.windows) {
    for (const beat of window.beats) {
      if (beat.reality && !bullets.includes(beat.reality)) {
        bullets.push(beat.reality);
      }
    }
  }

  if (bullets.length === 0) {
    bullets.push("No sustained patterns confirmed yet — the file is still accumulating history.");
  }

  return {
    bullets: bullets.slice(0, 8),
    confidence,
  };
}
