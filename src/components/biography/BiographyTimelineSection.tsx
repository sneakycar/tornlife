"use client";

import type { BiographyBeat, BiographyTimeline } from "@/lib/biography/types";
import { voiceLine } from "@/lib/ui/narrator-voice";

function BeatLine({ beat }: { beat: BiographyBeat }) {
  const line = beat.narrative || beat.reality;
  if (!line) return null;

  return (
    <li className="bio-beat">
      <p className="bio-beat-narrative">{voiceLine(line)}</p>
    </li>
  );
}

interface BiographyTimelineSectionProps {
  timeline: BiographyTimeline;
}

export function BiographyTimelineSection({ timeline }: BiographyTimelineSectionProps) {
  const hasAny = timeline.windows.some((w) => w.beats.length > 0);

  if (!hasAny) {
    return (
      <section className="dossier-section dossier-bio-timeline">
        <h2 className="dossier-heading">What Has Been Happening</h2>
        <p className="bio-timeline-empty">
          No sustained patterns yet. The file does not narrate single events — it
          waits for behavior that repeats.
        </p>
      </section>
    );
  }

  return (
    <section className="dossier-section dossier-bio-timeline">
      <h2 className="dossier-heading">What Has Been Happening</h2>

      {timeline.windows.map((window) => {
        if (window.beats.length === 0) return null;
        return (
          <div key={window.key} className="bio-window">
            <h3 className="bio-window-title">{window.title}</h3>
            <ul className="bio-beat-list">
              {window.beats.map((beat) => (
                <BeatLine key={beat.id} beat={beat} />
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
