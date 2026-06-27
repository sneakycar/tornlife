import type { EmergingArchetype, InterpretedChange } from "@/lib/db/types";
import { voiceLine } from "@/lib/ui/narrator-voice";

interface WhatChangedSectionProps {
  changes: InterpretedChange[];
  emerging: EmergingArchetype[];
  canonCandidates: string[];
}

export function WhatChangedSection({
  changes,
  emerging,
  canonCandidates,
}: WhatChangedSectionProps) {
  const growing = emerging.filter((a) => a.trend === "growing");
  const hasContent =
    changes.length > 0 || growing.length > 0 || canonCandidates.length > 0;

  if (!hasContent) return null;

  return (
    <section className="dossier-section dossier-what-changed">
      <h2 className="dossier-heading">What Changed</h2>

      {changes.map((change) => (
        <article key={`${change.field}-${change.title}`} className="dossier-evolution-item">
          <h3 className="evolution-headline">{evolutionHeadline(change)}</h3>
          <p className="evolution-body">{voiceLine(change.interpretation)}</p>
        </article>
      ))}

      {growing.map((arch) => (
        <article key={arch.name} className="dossier-evolution-item">
          <h3 className="evolution-headline">New Emerging Archetype</h3>
          <p className="evolution-body evolution-archetype">{arch.name}</p>
        </article>
      ))}

      {canonCandidates.map((candidate) => (
        <article key={candidate} className="dossier-evolution-item">
          <h3 className="evolution-headline">New Canon Candidate</h3>
          <p className="evolution-body">{voiceLine(candidate)}</p>
        </article>
      ))}
    </section>
  );
}

function evolutionHeadline(change: InterpretedChange): string {
  const title = change.title.replace(/_/g, " ");
  if (title.toLowerCase().includes("increased") || title.toLowerCase().includes("decreased")) {
    return `${title}.`;
  }
  if (title.toLowerCase().includes("changed")) {
    return `${title.replace(" Changed", "")} shifted.`;
  }
  return `${title}.`;
}
