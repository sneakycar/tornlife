import type { PageEvidence } from "../ui/page-evidence";
import type { BiographyTimeline } from "./types";

/** Receipt-style evidence from biography reality lines — not a profile dump. */
export function buildEvidenceFromTimeline(
  timeline: BiographyTimeline,
  confidence: PageEvidence["confidence"],
): PageEvidence {
  const bullets: string[] = [];

  for (const window of timeline.windows) {
    for (const beat of window.beats) {
      if (!bullets.includes(beat.reality)) {
        bullets.push(beat.reality);
      }
    }
  }

  if (bullets.length === 0) {
    bullets.push("Recent activity not yet recorded — sync history still building.");
  }

  return {
    bullets: bullets.slice(0, 12),
    confidence,
  };
}
