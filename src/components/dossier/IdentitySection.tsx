"use client";

import type { EvidenceBundle } from "@/lib/ui/build-evidence";
import { voiceLine } from "@/lib/ui/narrator-voice";

interface IdentitySectionProps {
  username: string;
  archetype: string;
  currentState: string;
}

export function IdentitySection({
  username,
  archetype,
  currentState,
}: IdentitySectionProps) {
  const state = voiceLine(currentState);

  return (
    <section className="dossier-section dossier-identity">
      <h1 className="dossier-username">{username}</h1>
      <p className="dossier-archetype">{archetype}</p>
      {state && <p className="dossier-current-state">{state}</p>}
    </section>
  );
}

/** Dev-only evidence panel — not used in player UI */
export function EvidencePanel({ evidence }: { evidence: EvidenceBundle }) {
  if (!evidence.bullets.length) return null;

  return (
    <div className="evidence-panel">
      <ul className="evidence-list">
        {evidence.bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
