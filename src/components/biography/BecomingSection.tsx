"use client";

import type { EmergingArchetype, PlayerProfile } from "@/lib/db/types";
import type { BiographyTimeline } from "@/lib/biography/types";
import { buildArchetypeBoard, buildArchetypeClassification } from "@/lib/archetypes/board-state";
import { ArchetypeBoard } from "../archetypes/ArchetypeBoard";

interface BecomingSectionProps {
  profile: PlayerProfile;
  emerging: EmergingArchetype[];
  timeline: BiographyTimeline;
}

export function BecomingSection({
  profile,
  emerging,
  timeline,
}: BecomingSectionProps) {
  const classification = buildArchetypeClassification(profile, emerging, []);
  const board = buildArchetypeBoard(profile, emerging);

  const showArchetype =
    timeline.hasEnoughForPatterns || timeline.totalBeats >= 3;

  if (!showArchetype) {
    return (
      <section className="dossier-section dossier-becoming dossier-becoming--pending">
        <h2 className="dossier-heading">Who They Are Becoming</h2>
        <p className="becoming-pending">
          The file has not written the conclusion yet. Keep living — the
          classification comes after the biography.
        </p>
      </section>
    );
  }

  return (
    <section className="dossier-section dossier-becoming">
      <h2 className="dossier-heading">Who They Are Becoming</h2>

      <p className="becoming-conclusion">
        Of course it&apos;s{" "}
        <span className="becoming-archetype-name">{classification.current}</span>
        .
      </p>

      <p className="becoming-explanation">{classification.driftExplanation}</p>

      {classification.driftingToward.length > 0 && (
        <p className="becoming-drift">
          Drifting toward {classification.driftingToward.join(", ")}.
        </p>
      )}

      <details className="becoming-board-details">
        <summary className="evidence-link-btn">Archetype board</summary>
        <div className="becoming-board-wrap">
          <ArchetypeBoard cells={board} currentName={profile.archetype} />
        </div>
      </details>
    </section>
  );
}
