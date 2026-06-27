"use client";

import { useState } from "react";
import type { BiographyBeat, BiographyTimeline } from "@/lib/biography/types";
import { voiceLine } from "@/lib/ui/narrator-voice";

function BeatLine({ beat }: { beat: BiographyBeat }) {
  const [showReality, setShowReality] = useState(false);

  return (
    <li className="bio-beat">
      <p className="bio-beat-narrative">
        {voiceLine(beat.narrative ?? beat.reality)}
      </p>
      {beat.narrative && beat.narrative !== beat.reality && (
        <>
          <button
            type="button"
            className="evidence-link-btn subtle"
            onClick={() => setShowReality((v) => !v)}
            aria-expanded={showReality}
          >
            {showReality ? "Hide" : "Record"}
          </button>
          {showReality && (
            <p className="bio-beat-reality">{beat.reality}</p>
          )}
        </>
      )}
    </li>
  );
}

interface BiographyTimelineSectionProps {
  timeline: BiographyTimeline;
}

export function BiographyTimelineSection({ timeline }: BiographyTimelineSectionProps) {
  const hasAny = timeline.windows.some((w) => w.beats.length > 0);

  return (
    <section className="dossier-section dossier-bio-timeline">
      <h2 className="dossier-heading">What Has Been Happening</h2>

      {!hasAny && (
        <p className="bio-timeline-empty">
          The file is still learning the rhythm of this life. Check back after
          more activity.
        </p>
      )}

      {timeline.windows.map((window) => (
        <div key={window.key} className="bio-window">
          <h3 className="bio-window-title">{window.title}</h3>
          {window.beats.length > 0 ? (
            <ul className="bio-beat-list">
              {window.beats.map((beat) => (
                <BeatLine key={beat.id} beat={beat} />
              ))}
            </ul>
          ) : (
            <p className="bio-window-empty">{window.unavailableNote}</p>
          )}
        </div>
      ))}
    </section>
  );
}
